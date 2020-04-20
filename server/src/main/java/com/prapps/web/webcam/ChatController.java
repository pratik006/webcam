package com.prapps.web.webcam;

import com.prapps.web.webcam.model.ChatMessage;
import com.prapps.web.webcam.model.MessageType;
import com.prapps.web.webcam.model.VideoMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.time.LocalDateTime;

@Controller
public class ChatController {
    private static final Logger LOG = LoggerFactory.getLogger(ChatController.class);

    @Autowired
    SessionCache sessionCache;

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
    @MessageMapping("/binary")
    @SendTo("/topic/video")
    public VideoMessage sendBlob(byte[] buf, SimpMessageHeaderAccessor headerAccessor) {
        LOG.info("videoMessage:" + new String(buf).length());
        VideoMessage videoMessage = new VideoMessage();
        videoMessage.setTime(LocalDateTime.now().toString());
        videoMessage.setSessionId(headerAccessor.getSessionId());
        videoMessage.setContent(new String(buf));
        if (!sessionCache.containsKey(headerAccessor.getSessionId())) {
            videoMessage.setMessageNumber(1);
            sessionCache.putIfAbsent(headerAccessor.getSessionId(), videoMessage);
        }
        return videoMessage;
    }

    @CrossOrigin(origins = "*")
    @MessageMapping("/chat/newUser")
    @SendTo("/topic/public")
    public ChatMessage newUser(final ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        return chatMessage;
    }
}
