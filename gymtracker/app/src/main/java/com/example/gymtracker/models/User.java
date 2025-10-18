package com.example.gymtracker.models;

/**
 * User - Data model class representing a user account
 * Contains user information including credentials and profile data
 * Used throughout the app to pass user data between activities and database
 */
public class User {
    private int id;
    private String username;
    private String email;
    private String passwordHash;

    public User() {}

    public User(String username, String email, String passwordHash) {
        // Private fields to store user data
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    // Getters and setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}