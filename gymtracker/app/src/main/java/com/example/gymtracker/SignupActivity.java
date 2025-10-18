package com.example.gymtracker;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.gymtracker.database.DatabaseHelper;

/**
 * SignupActivity - Handles new user registration
 * Allows users to create new accounts with username, email, and password
 * Validates input and prevents duplicate usernames/emails
 */

public class SignupActivity extends AppCompatActivity {
    private EditText getUsername, getEmail, getPassword, getConfirmPassword;
    private Button btnSignup;
    private DatabaseHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_signup);

        initViews();
        dbHelper = new DatabaseHelper(this);

        btnSignup.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                registerUser();
            }
        });
    }
    /**
     * Initialize all UI components by finding them in the layout
     * This connects our Java variables to the XML elements
     */
    private void initViews() {
        getUsername = findViewById(R.id.etUsername);
        getEmail = findViewById(R.id.etEmail);
        getPassword = findViewById(R.id.etPassword);
        getConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnSignup = findViewById(R.id.btnSignup);
    }

    private void registerUser() {
        String username = getUsername.getText().toString().trim();
        String email = getEmail.getText().toString().trim();
        String password = getPassword.getText().toString().trim();
        String confirmPassword = getConfirmPassword.getText().toString().trim();

        if (username.isEmpty() || email.isEmpty() || password.isEmpty() || confirmPassword.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        if (!password.equals(confirmPassword)) {
            Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show();
            return;
        }

        if (password.length() < 6) {
            Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show();
            return;
        }

        boolean success = dbHelper.registerUser(username, email, password);
        if (success) {
            Toast.makeText(this, "Registration successful! Please login.", Toast.LENGTH_SHORT).show();
            finish();
        } else {
            Toast.makeText(this, "Username or email already exists", Toast.LENGTH_SHORT).show();
        }
    }
}