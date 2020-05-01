package com.prapps.web.webcam.model;

public class ChatMessage extends AbstractMessage {
    private MessageType type;
    private String content;

    private int messageNumber;
    private int partNumber;
    private int partCount;

    public ChatMessage() {
    }

    public ChatMessage(MessageType messageType) {
        this.type = messageType;
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    @Override
    public String toString() {
        return "ChatMessage{" +
                "type=" + type +
                ", content='" + content + '\'' +
                ", sender='" + sender + '\'' +
                ", time='" + time + '\'' +
                ", messageNumber=" + messageNumber +
                ", partNumber=" + partNumber +
                ", partCount=" + partCount +
                '}';
    }

    public int getMessageNumber() {
        return messageNumber;
    }

    public void setMessageNumber(int messageNumber) {
        this.messageNumber = messageNumber;
    }

    public int getPartNumber() {
        return partNumber;
    }

    public void setPartNumber(int partNumber) {
        this.partNumber = partNumber;
    }

    public int getPartCount() {
        return partCount;
    }

    public void setPartCount(int partCount) {
        this.partCount = partCount;
    }


}
