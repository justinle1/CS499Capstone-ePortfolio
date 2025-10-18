package com.example.gymtracker.database;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.example.gymtracker.models.Entry;
import com.example.gymtracker.models.User;
import com.example.gymtracker.utils.PasswordUtils;

import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "GymTracker.db";
    private static final int DATABASE_VERSION = 1;

    // Users table
    private static final String TABLE_USERS = "users";
    private static final String COL_USER_ID = "id";
    private static final String COL_USERNAME = "username";
    private static final String COL_EMAIL = "email";
    private static final String COL_PASSWORD_HASH = "password_hash";

    // Entries table
    private static final String TABLE_ENTRIES = "entries";
    private static final String COL_ENTRY_ID = "id";
    private static final String COL_ENTRY_USER_ID = "user_id";
    private static final String COL_ENTRY_TYPE = "type";
    private static final String COL_ENTRY_TITLE = "title";
    private static final String COL_ENTRY_DESCRIPTION = "description";
    private static final String COL_ENTRY_DATE = "date";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // Create users table
        String createUsersTable = "CREATE TABLE " + TABLE_USERS + "("
                + COL_USER_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + COL_USERNAME + " TEXT UNIQUE NOT NULL,"
                + COL_EMAIL + " TEXT UNIQUE NOT NULL,"
                + COL_PASSWORD_HASH + " TEXT NOT NULL"
                + ")";

        // Create entries table
        String createEntriesTable = "CREATE TABLE " + TABLE_ENTRIES + "("
                + COL_ENTRY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + COL_ENTRY_USER_ID + " INTEGER NOT NULL,"
                + COL_ENTRY_TYPE + " TEXT NOT NULL,"
                + COL_ENTRY_TITLE + " TEXT NOT NULL,"
                + COL_ENTRY_DESCRIPTION + " TEXT,"
                + COL_ENTRY_DATE + " TEXT NOT NULL,"
                + "FOREIGN KEY(" + COL_ENTRY_USER_ID + ") REFERENCES " + TABLE_USERS + "(" + COL_USER_ID + ")"
                + ")";

        db.execSQL(createUsersTable);
        db.execSQL(createEntriesTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_ENTRIES);
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_USERS);
        onCreate(db);
    }

    // User methods
    public boolean registerUser(String username, String email, String password) {
        SQLiteDatabase db = this.getWritableDatabase();

        // Check if username or email already exists
        String checkQuery = "SELECT * FROM " + TABLE_USERS + " WHERE " + COL_USERNAME + "=? OR " + COL_EMAIL + "=?";
        Cursor cursor = db.rawQuery(checkQuery, new String[]{username, email});

        if (cursor.getCount() > 0) {
            cursor.close();
            return false; // User already exists
        }
        cursor.close();

        // Hash the password
        String passwordHash = PasswordUtils.hashPassword(password);

        ContentValues values = new ContentValues();
        values.put(COL_USERNAME, username);
        values.put(COL_EMAIL, email);
        values.put(COL_PASSWORD_HASH, passwordHash);

        long result = db.insert(TABLE_USERS, null, values);
        return result != -1;
    }

    public User loginUser(String username, String password) {
        SQLiteDatabase db = this.getReadableDatabase();
        String query = "SELECT * FROM " + TABLE_USERS + " WHERE " + COL_USERNAME + "=?";
        Cursor cursor = db.rawQuery(query, new String[]{username});

        if (cursor.moveToFirst()) {
            String storedHash = cursor.getString(cursor.getColumnIndexOrThrow(COL_PASSWORD_HASH));
            if (PasswordUtils.verifyPassword(password, storedHash)) {
                User user = new User();
                user.setId(cursor.getInt(cursor.getColumnIndexOrThrow(COL_USER_ID)));
                user.setUsername(cursor.getString(cursor.getColumnIndexOrThrow(COL_USERNAME)));
                user.setEmail(cursor.getString(cursor.getColumnIndexOrThrow(COL_EMAIL)));
                user.setPasswordHash(storedHash);
                cursor.close();
                return user;
            }
        }
        cursor.close();
        return null;
    }

    // Entry methods
    public long addEntry(Entry entry) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_ENTRY_USER_ID, entry.getUserId());
        values.put(COL_ENTRY_TYPE, entry.getType());
        values.put(COL_ENTRY_TITLE, entry.getTitle());
        values.put(COL_ENTRY_DESCRIPTION, entry.getDescription());
        values.put(COL_ENTRY_DATE, entry.getDate());

        return db.insert(TABLE_ENTRIES, null, values);
    }

    public List<Entry> getEntriesForDate(int userId, String date) {
        List<Entry> entries = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();

        String query = "SELECT * FROM " + TABLE_ENTRIES + " WHERE " + COL_ENTRY_USER_ID + "=? AND " + COL_ENTRY_DATE + "=?";
        Cursor cursor = db.rawQuery(query, new String[]{String.valueOf(userId), date});

        if (cursor.moveToFirst()) {
            do {
                Entry entry = new Entry();
                entry.setId(cursor.getInt(cursor.getColumnIndexOrThrow(COL_ENTRY_ID)));
                entry.setUserId(cursor.getInt(cursor.getColumnIndexOrThrow(COL_ENTRY_USER_ID)));
                entry.setType(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_TYPE)));
                entry.setTitle(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_TITLE)));
                entry.setDescription(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_DESCRIPTION)));
                entry.setDate(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_DATE)));
                entries.add(entry);
            } while (cursor.moveToNext());
        }
        cursor.close();
        return entries;
    }

    public Entry getEntryById(int entryId) {
        SQLiteDatabase db = this.getReadableDatabase();
        String query = "SELECT * FROM " + TABLE_ENTRIES + " WHERE " + COL_ENTRY_ID + "=?";
        Cursor cursor = db.rawQuery(query, new String[]{String.valueOf(entryId)});

        Entry entry = null;
        if (cursor.moveToFirst()) {
            entry = new Entry();
            entry.setId(cursor.getInt(cursor.getColumnIndexOrThrow(COL_ENTRY_ID)));
            entry.setUserId(cursor.getInt(cursor.getColumnIndexOrThrow(COL_ENTRY_USER_ID)));
            entry.setType(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_TYPE)));
            entry.setTitle(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_TITLE)));
            entry.setDescription(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_DESCRIPTION)));
            entry.setDate(cursor.getString(cursor.getColumnIndexOrThrow(COL_ENTRY_DATE)));
        }
        cursor.close();
        return entry;
    }

    public boolean updateEntry(Entry entry) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_ENTRY_USER_ID, entry.getUserId());
        values.put(COL_ENTRY_TYPE, entry.getType());
        values.put(COL_ENTRY_TITLE, entry.getTitle());
        values.put(COL_ENTRY_DESCRIPTION, entry.getDescription());
        values.put(COL_ENTRY_DATE, entry.getDate());

        int rows = db.update(TABLE_ENTRIES, values, COL_ENTRY_ID + " = ?",
                new String[]{String.valueOf(entry.getId())});
        db.close();
        return rows > 0;
    }

    public int deleteEntry(int entryId) {
        SQLiteDatabase db = this.getWritableDatabase();
        int rowsDeleted = db.delete(TABLE_ENTRIES,
                COL_ENTRY_ID + " = ?",
                new String[]{String.valueOf(entryId)});
        db.close();
        return rowsDeleted;
    }
}