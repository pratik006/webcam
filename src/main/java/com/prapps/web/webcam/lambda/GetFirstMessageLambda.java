package com.prapps.web.webcam.lambda;

import com.prapps.web.webcam.SessionCache;
import com.prapps.web.webcam.model.VideoMessage;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.function.Function;

public class GetFirstMessageLambda implements Function<String, VideoMessage> {

    @Autowired
    SessionCache sessionCache;

    @Override
    public VideoMessage apply(String sessionId) {
        return sessionCache.get(sessionId);
    }
}
