package com.example.gymtracker;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.example.gymtracker.database.UserSession;

/**
 * MainActivity - Entry point of the application
 * This activity checks if user is already logged in and redirects accordingly
 * It acts as a router - no UI is displayed, just decision making
 */

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        UserSession session = new UserSession(this);

        if (session.isLoggedIn()) {
            // User is logged in, go to calendar
            startActivity(new Intent(this, CalendarActivity.class));
        } else {
            // User not logged in, go to login
            startActivity(new Intent(this, LoginActivity.class));
        }
        finish();
    }
}