package com.prapps.web.webcam.lambda;

import java.util.function.Function;

public class IsAliveLambda implements Function<Void, String> {
    @Override
    public String apply(Void aVoid) {
        return "alive";
    }
}
