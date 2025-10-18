package com.example.gymtracker.models;

public class Entry {
    private int id;
    private int userId;
    private String type; // "goal", "activity", "diary"
    private String title;
    private String description;
    private String date; // Format: YYYY-MM-DD

    public Entry() {}

    public Entry(int userId, String type, String title, String description, String date) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.description = description;
        this.date = date;
    }

    // Getters and setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}