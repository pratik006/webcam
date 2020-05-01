package com.prapps.web.webcam;

import java.util.Random;

public class RandomString {

    static final int OUTPUT_STRING_LENGTH = 8;
    private static String ALLOWED_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    public String generate(int len) {
/*
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for(int i=0; i<len; i++){
            sb.append( getNextRandomString(ALLOWED_CHARS, random) );
        }
        return sb.toString();*/
        return getNextRandomString(ALLOWED_CHARS, new Random());
    }

    private static String getNextRandomString(String strAllowedCharacters, Random random) {

        StringBuilder sbRandomString = new StringBuilder(OUTPUT_STRING_LENGTH);

        for(int i = 0 ; i < OUTPUT_STRING_LENGTH; i++){

            //get random integer between 0 and string length
            int randomInt = random.nextInt(strAllowedCharacters.length());

            //get char from randomInt index from string and append in StringBuilder
            sbRandomString.append( strAllowedCharacters.charAt(randomInt) );
        }

        return sbRandomString.toString();

    }
}
