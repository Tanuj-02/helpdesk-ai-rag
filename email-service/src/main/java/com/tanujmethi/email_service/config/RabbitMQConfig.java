package com.tanujmethi.email_service.config;

import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    /**
     * Spring Boot auto-config wires a single {@link org.springframework.amqp.support.converter.MessageConverter}
     * bean into the @RabbitListener container factory. Without this bean the listeners fall back to
     * SimpleMessageConverter, which cannot read the JSON bodies produced by raghelpdesk's
     * JacksonJsonMessageConverter.
     */
    @Bean
    public JacksonJsonMessageConverter jacksonJsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}