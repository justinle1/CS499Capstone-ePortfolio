package com.example.gymtracker;

import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.example.gymtracker.database.DatabaseHelper;
import com.example.gymtracker.database.UserSession;
import com.example.gymtracker.models.Entry;

/**
 * AddEditEntryActivity - Handles adding new entries and editing existing ones
 * This single activity serves dual purpose based on whether an entry ID is passed
 * Allows users to create goals, activities, and diary entries with title and description
 */

public class AddEditEntryActivity extends AppCompatActivity {
    private Spinner spinnerType;
    private EditText etTitle, etDescription;
    private Button btnSave;
    private DatabaseHelper dbHelper;
    private UserSession session;
    private String date;
    private int entryId = -1;
    private boolean isEditMode = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_edit_entry);

        initViews();
        dbHelper = new DatabaseHelper(this);
        session = new UserSession(this);

        date = getIntent().getStringExtra("date");
        entryId = getIntent().getIntExtra("entry_id", -1);
        isEditMode = entryId != -1;

        setupSpinner();

        if (isEditMode) {
            setTitle("Edit Entry");
            loadEntryData();
        } else {
            setTitle("Add Entry");
        }

        btnSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveEntry();
            }
        });
    }

    private void initViews() {
        spinnerType = findViewById(R.id.spinnerType);
        etTitle = findViewById(R.id.etTitle);
        etDescription = findViewById(R.id.etDescription);
        btnSave = findViewById(R.id.btnSave);
    }

    private void setupSpinner() {
        String[] types = {"Goal", "Activity", "Diary"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, types);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerType.setAdapter(adapter);
    }

    private void loadEntryData() {
        Entry entry = dbHelper.getEntryById(entryId);
        if (entry != null) {
            etTitle.setText(entry.getTitle());
            etDescription.setText(entry.getDescription());

            // Set spinner selection
            String[] types = {"goal", "activity", "diary"};
            for (int i = 0; i < types.length; i++) {
                if (types[i].equals(entry.getType())) {
                    spinnerType.setSelection(i);
                    break;
                }
            }
        }
    }

    private void saveEntry() {
        String type = spinnerType.getSelectedItem().toString().toLowerCase();
        String title = etTitle.getText().toString().trim();
        String description = etDescription.getText().toString().trim();

        if (title.isEmpty()) {
            Toast.makeText(this, "Please enter a title", Toast.LENGTH_SHORT).show();
            return;
        }

        Entry entry = new Entry(session.getUserId(), type, title, description, date);

        if (isEditMode) {
            entry.setId(entryId);
            if (dbHelper.updateEntry(entry)) {
                Toast.makeText(this, "Entry updated successfully", Toast.LENGTH_SHORT).show();
                finish();
            } else {
                Toast.makeText(this, "Failed to update entry", Toast.LENGTH_SHORT).show();
            }
        } else {
            long result = dbHelper.addEntry(entry);
            if (result != -1) {
                Toast.makeText(this, "Entry added successfully", Toast.LENGTH_SHORT).show();
                finish();
            } else {
                Toast.makeText(this, "Failed to add entry", Toast.LENGTH_SHORT).show();
            }
        }
    }
}