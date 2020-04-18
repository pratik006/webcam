package com.prapps.web.webcam;

import com.prapps.web.webcam.model.ChatMessage;
import com.prapps.web.webcam.model.MessageType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;

@Controller
public class ChatController {
    private static final Logger LOG = LoggerFactory.getLogger(ChatController.class);

    @CrossOrigin(origins = "*")
    @MessageMapping("/user")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload final ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        LOG.debug("chatMessage:" + chatMessage);
        chatMessage.setTime(LocalDateTime.now().toString());
        chatMessage.setSessionId(headerAccessor.getSessionId());
        return chatMessage;
    }

    @CrossOrigin(origins = "*")
    @MessageMapping("/chat/newUser")
    @SendTo("/topic/public")
    public ChatMessage newUser(final ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        return chatMessage;
    }
}
