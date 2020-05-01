package com.prapps.web.webcam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Scope;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    @Scope("singleton")
    public SessionCache sessionCache() {
        return new SessionCache();
    }

    @Bean
    @Scope("singleton")
    public RandomString create() { return new RandomString(); }

}