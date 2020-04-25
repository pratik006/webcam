package com.prapps.web.webcam;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final int DATA_SIZE = 1024 * 1024;

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(DATA_SIZE);
        registration.setSendBufferSizeLimit(DATA_SIZE);
        registration.setSendTimeLimit(20000);
    }

    @Override
    public void registerStompEndpoints(final StompEndpointRegistry registry) {
        WebSocketTransportRegistration webSocketTransportRegistration = new WebSocketTransportRegistration();
        webSocketTransportRegistration.setMessageSizeLimit(1024*1024*1024);
        webSocketTransportRegistration.setSendBufferSizeLimit(1024*1024*1024);
        this.configureWebSocketTransport(webSocketTransportRegistration);
        registry.addEndpoint("/web-conference").setAllowedOrigins("*").withSockJS().setStreamBytesLimit(1000000000);
    }

    public void configureMessageBroker(final MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic");
    }

}
