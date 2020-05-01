package com.prapps.web.webcam;

import com.prapps.web.webcam.model.ChatMessage;
import com.prapps.web.webcam.model.MessageType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger LOG = LoggerFactory.getLogger(WebSocketEventListener.class);
    @Autowired
    private SimpMessageSendingOperations sendingOperations;
    @Autowired
    SessionCache sessionCache;

    @EventListener
    public void handleWebSocketConnectListener(final SessionConnectedEvent evt) {
        final StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(evt.getMessage());
        Map headerMap = StompHeaderAccessor.getMutableAccessor(evt.getMessage())
                .getMessageHeaders().get("simpConnectMessage", GenericMessage.class).getHeaders()
                .get("nativeHeaders", Map.class);
        String roomId = (String) ((List) headerMap.get("roomId")).get(0);
        if (StringUtils.isEmpty(roomId) || !sessionCache.isRoomCreated(roomId)) {
            throw new RuntimeException("Room not created");
        }
        //final String username = (String) headerAccessor.getSessionAttributes().get("username");
        final ChatMessage chatMessage = new ChatMessage(MessageType.CONNECT);
        chatMessage.setSessionId(headerAccessor.getSessionId());
        //chatMessage.setSender(username);
        sendingOperations.convertAndSend("/topic/public/"+roomId, chatMessage);
        sessionCache.getEntries().stream().forEach(entry -> {
            if (!headerAccessor.getSessionId().equals(entry.getKey())) {
                sendingOperations.convertAndSend("/topic/public/"+roomId, entry.getValue());
            }
        });
        LOG.info("connected: "+headerAccessor.getSessionId());
    }

    @EventListener
    public void handleWebSocketDisconnectListener(final SessionDisconnectEvent evt) {
        final StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(evt.getMessage());
        final String username = (String) headerAccessor.getSessionAttributes().get("username");
        final ChatMessage chatMessage = new ChatMessage(MessageType.DISCONNECT);
        chatMessage.setSessionId(headerAccessor.getSessionId());
        sendingOperations.convertAndSend("/topic/public", chatMessage);
        sessionCache.remove(headerAccessor.getSessionId());
        LOG.info("disconnected "+headerAccessor.getSessionId());
    }
}
