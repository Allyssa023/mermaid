package com.mermaid.app.service;

import com.mermaid.app.domain.BfarReferencePrice;
import com.mermaid.app.domain.CatchLog;
import com.mermaid.app.domain.FishSpecies;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.model.FishermanAnalytics;
import org.openapitools.jackson.nullable.JsonNullable;
import com.mermaid.app.model.TopSpeciesEntry;
import com.mermaid.app.model.TripAnalyticsSummary;
import com.mermaid.app.model.TripSpeciesSummary;
import com.mermaid.app.repository.BfarReferencePriceRepository;
import com.mermaid.app.repository.CatchLogRepository;
import com.mermaid.app.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TripAnalyticsService {

    private final TripRepository tripRepo;
    private final CatchLogRepository catchLogRepo;
    private final BfarReferencePriceRepository bfarRepo;

    public TripAnalyticsService(TripRepository tripRepo,
                                CatchLogRepository catchLogRepo,
                                BfarReferencePriceRepository bfarRepo) {
        this.tripRepo     = tripRepo;
        this.catchLogRepo = catchLogRepo;
        this.bfarRepo     = bfarRepo;
    }

    @Transactional(readOnly = true)
    public TripAnalyticsSummary getTripSummary(Long tripId, Long fishermanId) {
        tripRepo.findByIdAndFishermanId(tripId, fishermanId)
            .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));

        List<CatchLog> catches = catchLogRepo.findAllByTripIdOrderByLoggedAtDesc(tripId);

        Map<Long, BigDecimal> bfarMidBySpecies = buildBfarMidMap();

        int totalCatches  = catches.size();
        long settledCount = catches.stream().filter(c -> Boolean.TRUE.equals(c.getIsSettled())).count();
        BigDecimal totalKgLogged  = sum(catches, c -> c.getQuantityKg());
        BigDecimal totalKgSettled = sum(
            catches.stream().filter(c -> Boolean.TRUE.equals(c.getIsSettled())).collect(Collectors.toList()),
            CatchLog::getSettledKg);
        BigDecimal totalEarned = sumProduct(catches, CatchLog::getSettledKg, CatchLog::getSettledPricePerKg);

        List<TripSpeciesSummary> perSpecies = new ArrayList<>();
        BigDecimal bfarTotalRef = BigDecimal.ZERO;

        Map<Long, List<CatchLog>> bySpecies = catches.stream()
            .filter(c -> c.getSpecies() != null)
            .collect(Collectors.groupingBy(c -> c.getSpecies().getId()));

        for (Map.Entry<Long, List<CatchLog>> entry : bySpecies.entrySet()) {
            Long speciesId = entry.getKey();
            List<CatchLog> group = entry.getValue();
            FishSpecies sp = group.get(0).getSpecies();

            BigDecimal spKgSettled = sum(
                group.stream().filter(c -> Boolean.TRUE.equals(c.getIsSettled())).collect(Collectors.toList()),
                CatchLog::getSettledKg);
            BigDecimal spEarned = sumProduct(group, CatchLog::getSettledKg, CatchLog::getSettledPricePerKg);

            BigDecimal mid = bfarMidBySpecies.get(speciesId);
            BigDecimal spBfarRef = mid != null ? spKgSettled.multiply(mid) : BigDecimal.ZERO;
            bfarTotalRef = bfarTotalRef.add(spBfarRef);

            TripSpeciesSummary row = new TripSpeciesSummary();
            row.setSpeciesId(speciesId);
            row.setSpeciesName(sp.getCommonName());
            row.setCatchCount(group.size());
            row.setSettledCount(group.stream().filter(c -> Boolean.TRUE.equals(c.getIsSettled())).count());
            row.setKgSettled(spKgSettled.doubleValue());
            row.setEarned(spEarned.doubleValue());
            row.setBfarMidPrice(mid != null ? JsonNullable.of(mid.doubleValue()) : JsonNullable.undefined());
            row.setBfarReference(spBfarRef.doubleValue());
            row.setPriceGap(spBfarRef.subtract(spEarned).doubleValue());
            perSpecies.add(row);
        }

        TripAnalyticsSummary summary = new TripAnalyticsSummary();
        summary.setTripId(tripId);
        summary.setTotalCatches(totalCatches);
        summary.setSettledCount(settledCount);
        summary.setTotalKgLogged(totalKgLogged.doubleValue());
        summary.setTotalKgSettled(totalKgSettled.doubleValue());
        summary.setTotalEarned(totalEarned.doubleValue());
        summary.setBfarTotalReference(bfarTotalRef.doubleValue());
        summary.setPriceGap(bfarTotalRef.subtract(totalEarned).doubleValue());
        summary.setPerSpecies(perSpecies);
        return summary;
    }

    @Transactional(readOnly = true)
    public FishermanAnalytics getFishermanAnalytics(Long fishermanId) {
        List<CatchLog> allCatches = catchLogRepo.findAllByFishermanId(fishermanId);
        Map<Long, BigDecimal> bfarMidBySpecies = buildBfarMidMap();

        int tripCount = (int) allCatches.stream().map(CatchLog::getTripId).distinct().count();

        BigDecimal totalEarned   = BigDecimal.ZERO;
        BigDecimal bfarReference = BigDecimal.ZERO;
        Map<String, BigDecimal[]> speciesEarnings = new LinkedHashMap<>();

        for (CatchLog c : allCatches) {
            if (!Boolean.TRUE.equals(c.getIsSettled())) continue;
            if (c.getSettledKg() == null || c.getSettledPricePerKg() == null) continue;

            BigDecimal earned = c.getSettledKg().multiply(c.getSettledPricePerKg());
            totalEarned = totalEarned.add(earned);

            if (c.getSpecies() != null) {
                String name = c.getSpecies().getCommonName();
                speciesEarnings.computeIfAbsent(name, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                speciesEarnings.get(name)[0] = speciesEarnings.get(name)[0].add(earned);
                speciesEarnings.get(name)[1] = speciesEarnings.get(name)[1].add(c.getSettledKg());

                BigDecimal mid = bfarMidBySpecies.get(c.getSpecies().getId());
                if (mid != null) bfarReference = bfarReference.add(c.getSettledKg().multiply(mid));
            }
        }

        List<TopSpeciesEntry> topSpecies = speciesEarnings.entrySet().stream()
            .map(e -> {
                TopSpeciesEntry t = new TopSpeciesEntry();
                t.setSpeciesName(e.getKey());
                t.setTotalEarned(e.getValue()[0].doubleValue());
                t.setTotalKgSettled(e.getValue()[1].doubleValue());
                return t;
            })
            .sorted(Comparator.<TopSpeciesEntry>comparingDouble(t -> t.getTotalEarned()).reversed())
            .limit(5)
            .collect(Collectors.toList());

        FishermanAnalytics result = new FishermanAnalytics();
        result.setFishermanId(fishermanId);
        result.setTripCount(tripCount);
        result.setTotalEarned(totalEarned.doubleValue());
        result.setBfarTotalReference(bfarReference.doubleValue());
        result.setPriceGap(bfarReference.subtract(totalEarned).doubleValue());
        result.setTopSpecies(topSpecies);
        return result;
    }

    private Map<Long, BigDecimal> buildBfarMidMap() {
        return bfarRepo.findLatestPerSpecies().stream()
            .collect(Collectors.toMap(
                b -> b.getSpecies().getId(),
                b -> b.getMinPricePerKg().add(b.getMaxPricePerKg())
                     .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP),
                (a, b) -> a
            ));
    }

    private BigDecimal sum(List<CatchLog> list, java.util.function.Function<CatchLog, BigDecimal> fn) {
        return list.stream()
            .map(c -> fn.apply(c) != null ? fn.apply(c) : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumProduct(List<CatchLog> list,
                                  java.util.function.Function<CatchLog, BigDecimal> qty,
                                  java.util.function.Function<CatchLog, BigDecimal> price) {
        return list.stream()
            .filter(c -> Boolean.TRUE.equals(c.getIsSettled()) && qty.apply(c) != null && price.apply(c) != null)
            .map(c -> qty.apply(c).multiply(price.apply(c)))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
