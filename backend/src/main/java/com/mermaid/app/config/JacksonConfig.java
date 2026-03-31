package com.mermaid.app.config;

import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.BeanProperty;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer jsonNullableCustomizer() {
        return builder -> builder.addModule(jsonNullableModule());
    }

    private JacksonModule jsonNullableModule() {
        SimpleModule module = new SimpleModule("json-nullable-jackson3");
        module.addSerializer((Class<JsonNullable<?>>) (Class<?>) JsonNullable.class, new JsonNullableSerializer());
        module.addDeserializer((Class<JsonNullable<?>>) (Class<?>) JsonNullable.class, new JsonNullableDeserializer(null));
        return module;
    }

    static final class JsonNullableSerializer extends ValueSerializer<JsonNullable<?>> {
        @Override
        public void serialize(JsonNullable<?> value, JsonGenerator gen, SerializationContext ctxt) throws JacksonException {
            if (value == null || value.isUndefined()) {
                ctxt.defaultSerializeNullValue(gen);
                return;
            }

            Object raw = value.orElse(null);
            if (raw == null) {
                ctxt.defaultSerializeNullValue(gen);
                return;
            }
            ctxt.writeValue(gen, raw);
        }

        @Override
        public boolean isEmpty(SerializationContext ctxt, JsonNullable<?> value) {
            return value == null || value.isUndefined();
        }
    }

    static final class JsonNullableDeserializer extends ValueDeserializer<JsonNullable<?>> {
        private final JavaType valueType;

        JsonNullableDeserializer(JavaType valueType) {
            this.valueType = valueType;
        }

        @Override
        public JsonNullable<?> deserialize(JsonParser p, DeserializationContext ctxt) throws JacksonException {
            JavaType targetType = (valueType != null) ? valueType : ctxt.constructType(Object.class);
            return JsonNullable.of(ctxt.readValue(p, targetType));
        }

        @Override
        public Object getNullValue(DeserializationContext ctxt) {
            return JsonNullable.of(null);
        }

        @Override
        public Object getAbsentValue(DeserializationContext ctxt) {
            return JsonNullable.undefined();
        }

        @Override
        public ValueDeserializer<?> createContextual(DeserializationContext ctxt, BeanProperty property) {
            if (property == null) {
                return this;
            }
            JavaType contained = property.getType().containedTypeOrUnknown(0);
            return new JsonNullableDeserializer(contained);
        }
    }
}
