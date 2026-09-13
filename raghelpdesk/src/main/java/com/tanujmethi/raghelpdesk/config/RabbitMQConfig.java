package com.tanujmethi.raghelpdesk.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String DOCUMENT_VERIFICATION_EXCHANGE =
            "document.exchange";

    public static final String DOCUMENT_VERIFICATION_ROUTING_KEY =
            "document.verification.requested";
    public static final String DOCUMENT_EMAIL_ROUTING_KEY =
            "document.email.routing_key";


    public static final String DOCUMENT_VERIFICATION_RESULT_EXCHANGE =
            "document.exchange";

    public static final String DOCUMENT_VERIFICATION_RESULT_QUEUE =
            "document.verification.result.queue";

    public static final String DOCUMENT_VERIFICATION_RESULT_ROUTING_KEY =
            "document.verification.completed";


//    @Bean
//    public DirectExchange documentVerificationExchange() {
//
//        return new DirectExchange(
//                DOCUMENT_VERIFICATION_EXCHANGE
//        );
//    }

//
//    @Bean
//    public DirectExchange documentVerificationResultExchange() {
//
//        return new DirectExchange(
//                DOCUMENT_VERIFICATION_RESULT_EXCHANGE
//        );
//    }

//
//    @Bean
//    public Queue documentVerificationResultQueue() {
//
//        return new Queue(
//                DOCUMENT_VERIFICATION_RESULT_QUEUE,
//                true
//        );
//    }


//    @Bean
//    public Binding documentVerificationResultBinding(
//            Queue documentVerificationResultQueue,
//            DirectExchange documentVerificationResultExchange
//    ) {
//
//        return BindingBuilder
//                .bind(documentVerificationResultQueue)
//                .to(documentVerificationResultExchange)
//                .with(DOCUMENT_VERIFICATION_RESULT_ROUTING_KEY);
//    }

    @Bean
    public JacksonJsonMessageConverter jacksonJsonMessageConverter() {

        return new JacksonJsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(
            ConnectionFactory connectionFactory,
            JacksonJsonMessageConverter messageConverter
    ) {

        RabbitTemplate rabbitTemplate =
                new RabbitTemplate(connectionFactory);

        rabbitTemplate.setMessageConverter(messageConverter);

        return rabbitTemplate;
    }
}