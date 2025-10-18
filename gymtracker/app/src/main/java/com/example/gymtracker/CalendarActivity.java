package com.example.gymtracker;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CalendarView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.example.gymtracker.database.DatabaseHelper;
import com.example.gymtracker.database.UserSession;
import com.example.gymtracker.models.Entry;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * CalendarActivity - Main screen of the app after login
 * Displays calendar for date selection and shows gym entries for selected date
 * Allows users to add, edit, and delete entries
 */

public class CalendarActivity extends AppCompatActivity {
    private CalendarView calendarView;
    private RecyclerView recyclerViewEntries;
    private TextView tvSelectedDate;
    private FloatingActionButton fabAddEntry;
    private DatabaseHelper dbHelper;
    private UserSession session;
    private EntryAdapter entryAdapter;
    private String selectedDate;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_calendar);

        initViews();
        dbHelper = new DatabaseHelper(this);
        session = new UserSession(this);

        // Set today's date as default
        Calendar today = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        selectedDate = sdf.format(today.getTime());

        setupRecyclerView();
        loadEntriesForDate(selectedDate);

        calendarView.setOnDateChangeListener(new CalendarView.OnDateChangeListener() {
            @Override
            public void onSelectedDayChange(CalendarView view, int year, int month, int dayOfMonth) {
                selectedDate = String.format(Locale.getDefault(), "%04d-%02d-%02d", year, month + 1, dayOfMonth);
                tvSelectedDate.setText("Entries for " + selectedDate);
                loadEntriesForDate(selectedDate);
            }
        });

        fabAddEntry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(CalendarActivity.this, AddEditEntryActivity.class);
                intent.putExtra("date", selectedDate);
                startActivity(intent);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadEntriesForDate(selectedDate);
    }

    private void initViews() {
        calendarView = findViewById(R.id.calendarView);
        recyclerViewEntries = findViewById(R.id.recyclerViewEntries);
        tvSelectedDate = findViewById(R.id.tvSelectedDate);
        fabAddEntry = findViewById(R.id.fabAddEntry);
    }

    private void setupRecyclerView() {
        entryAdapter = new EntryAdapter(this, new EntryAdapter.OnEntryClickListener() {
            @Override
            public void onEditEntry(Entry entry) {
                Intent intent = new Intent(CalendarActivity.this, AddEditEntryActivity.class);
                intent.putExtra("entry_id", entry.getId());
                intent.putExtra("date", selectedDate);
                startActivity(intent);
            }

            @Override
            public void onDeleteEntry(Entry entry) {
                showDeleteConfirmation(entry);
            }
        });
        recyclerViewEntries.setLayoutManager(new LinearLayoutManager(this));
        recyclerViewEntries.setAdapter(entryAdapter);
    }
    /**
     * Load and display entries for the specified date
     * Updates both the adapter and the date header
     */
    private void loadEntriesForDate(String date) {
        List<Entry> entries = dbHelper.getEntriesForDate(session.getUserId(), date);
        entryAdapter.setEntries(entries);
        tvSelectedDate.setText("Entries for " + date + " (" + entries.size() + ")");
    }

    private void showDeleteConfirmation(Entry entry) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Entry")
                .setMessage("Are you sure you want to delete this entry?")
                .setPositiveButton("Delete", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        if (dbHelper.deleteEntry(entry.getId()) > 0) {
                            loadEntriesForDate(selectedDate);
                        }
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == R.id.action_logout) {
            session.logoutUser();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}

class EntryAdapter extends RecyclerView.Adapter<EntryAdapter.EntryViewHolder> {
    private Context context;
    private List<Entry> entries;
    private OnEntryClickListener listener;

    public interface OnEntryClickListener {
        void onEditEntry(Entry entry);
        void onDeleteEntry(Entry entry);
    }

    public EntryAdapter(Context context, OnEntryClickListener listener) {
        this.context = context;
        this.listener = listener;
        this.entries = new ArrayList<>();
    }

    public void setEntries(List<Entry> entries) {
        this.entries = entries;
        notifyDataSetChanged();
    }

    @Override
    public EntryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_entry, parent, false);
        return new EntryViewHolder(view);
    }

    @Override
    public void onBindViewHolder(EntryViewHolder holder, int position) {
        Entry entry = entries.get(position);
        holder.bind(entry);
    }

    @Override
    public int getItemCount() {
        return entries.size();
    }

    class EntryViewHolder extends RecyclerView.ViewHolder {
        TextView tvType, tvTitle, tvDescription;
        Button btnEdit, btnDelete;

        public EntryViewHolder(View itemView) {
            super(itemView);
            tvType = itemView.findViewById(R.id.tvType);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvDescription = itemView.findViewById(R.id.tvDescription);
            btnEdit = itemView.findViewById(R.id.btnEdit);
            btnDelete = itemView.findViewById(R.id.btnDelete);
        }

        public void bind(Entry entry) {
            tvType.setText(entry.getType().toUpperCase());
            tvTitle.setText(entry.getTitle());
            tvDescription.setText(entry.getDescription());

            // Set type color
            int color = context.getResources().getColor(
                    entry.getType().equals("goal") ? R.color.goal_color :
                            entry.getType().equals("activity") ? R.color.activity_color : R.color.diary_color
            );
            tvType.setBackgroundColor(color);

            btnEdit.setOnClickListener(v -> listener.onEditEntry(entry));
            btnDelete.setOnClickListener(v -> listener.onDeleteEntry(entry));
        }
    }
}