package com.example.gymtracker;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.gymtracker.database.DatabaseHelper;
import com.example.gymtracker.database.UserSession;
import com.example.gymtracker.models.User;

/**
 * LoginActivity - Handles user authentication
 * Allows existing users to log into their accounts
 * Provides navigation to signup screen for new users
 */

public class LoginActivity extends AppCompatActivity {
    private EditText getUsername, getPassword; //input fields for login
    private Button btnLogin;
    private TextView tvSignup;
    private DatabaseHelper dbHelper;
    private UserSession session;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        initViews();
        dbHelper = new DatabaseHelper(this);    // Create database helper instance
        session = new UserSession(this);        // Create session manager instance

        btnLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                loginUser();
            }
        });

        tvSignup.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(LoginActivity.this, SignupActivity.class));
            }
        });
    }
    /**
     * Initialize all UI components by finding them in the layout
     * This connects our Java variables to the XML elements
     */
    private void initViews() {
        getUsername = findViewById(R.id.getUsername);
        getPassword = findViewById(R.id.getPassword);
        btnLogin = findViewById(R.id.btnLogin);
        tvSignup = findViewById(R.id.tvSignup);
    }

    private void loginUser() {
        String username = getUsername.getText().toString().trim();
        String password = getPassword.getText().toString().trim();

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        User user = dbHelper.loginUser(username, password);
        if (user != null) {
            session.createLoginSession(user);
            startActivity(new Intent(this, CalendarActivity.class));
            finish();
        } else {
            Toast.makeText(this, "Invalid credentials", Toast.LENGTH_SHORT).show();
        }
    }
}