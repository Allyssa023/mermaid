package com.mermaid.app.service;

import com.mermaid.app.domain.Deal;
import com.mermaid.app.domain.DealStatus;
import com.mermaid.app.domain.Message;
import com.mermaid.app.domain.User;
import com.mermaid.app.exception.DealConflictException;
import com.mermaid.app.exception.ResourceNotFoundException;
import com.mermaid.app.repository.DealRepository;
import com.mermaid.app.repository.MessageRepository;
import com.mermaid.app.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final DealRepository dealRepository;

    public MessageService(MessageRepository messageRepository,
                          UserRepository userRepository,
                          DealRepository dealRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.dealRepository = dealRepository;
    }

    public List<User> getChatContacts(Long userId) {
        return messageRepository.findUsersWithConversations(userId);
    }

    public List<Message> getConversation(Long userId, Long otherUserId) {
        return messageRepository.findConversation(userId, otherUserId);
    }

    @Transactional
    public Message saveMessage(Long senderId, Long recipientId, String content) {
        return saveMessage(senderId, recipientId, content, null);
    }

    /**
     * Persist a chat message, optionally tagged to a deal thread. When dealId is
     * non-null, the sender must be a participant and the deal must still be
     * NEGOTIATING; the recipient is forced to the counterparty regardless of what
     * the caller passed in.
     */
    @Transactional
    public Message saveMessage(Long senderId, Long recipientId, String content, Long dealId) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid sender"));

        Deal deal = null;
        if (dealId != null) {
            deal = dealRepository.findById(dealId)
                    .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId));
            if (!deal.getVendorId().equals(senderId) && !deal.getFishermanId().equals(senderId)) {
                throw new AccessDeniedException("Not a participant of deal " + dealId);
            }
            if (deal.getStatus() != DealStatus.NEGOTIATING) {
                throw new DealConflictException("Deal " + dealId + " is " + deal.getStatus());
            }
            recipientId = deal.getVendorId().equals(senderId)
                    ? deal.getFishermanId()
                    : deal.getVendorId();
        }

        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid recipient"));

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(content);
        if (deal != null) {
            message.setDeal(deal);
        }

        return messageRepository.save(message);
    }
}
