package com.tanujmethi.fileVerification.config;

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

    public static final String DOCUMENT_VERIFICATION_QUEUE =
            "document.verification.queue";

    public static final String DOCUMENT_VERIFICATION_ROUTING_KEY =
            "document.verification.requested";


    public static final String DOCUMENT_VERIFICATION_RESULT_EXCHANGE = "document.exchange";

    public static final String DOCUMENT_VERIFICATION_RESULT_ROUTING_KEY = "document.verification.completed";
    public static final String DOCUMENT_VECTOR_ROUTING_KEY = "document.vector.routing_key";


//    @Bean
//    public DirectExchange documentVerificationExchange() {
//
//        return new DirectExchange(
//                DOCUMENT_VERIFICATION_EXCHANGE
//        );
//    }


//    @Bean
//    public Queue documentVerificationQueue() {
//
//        return new Queue(
//                DOCUMENT_VERIFICATION_QUEUE,
//                true
//        );
//    }


//    @Bean
//    public Binding documentVerificationBinding(
//            Queue documentVerificationQueue,
//            DirectExchange documentVerificationExchange
//    ) {
//
//        return BindingBuilder
//                .bind(documentVerificationQueue)
//                .to(documentVerificationExchange)
//                .with(DOCUMENT_VERIFICATION_ROUTING_KEY);
//    }

//    @Bean
//    public DirectExchange documentVerificationResultExchange() {
//
//        return new DirectExchange(
//                DOCUMENT_VERIFICATION_RESULT_EXCHANGE
//        );
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