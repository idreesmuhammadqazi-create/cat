package com.marmalade.pet;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

  private static final int REQ_NOTIFICATIONS = 11;

  private static final int CREAM = 0xFFF6E8D5;
  private static final int CARD = 0xFFFFFAF2;
  private static final int BORDER = 0xFFEAD8BE;
  private static final int BROWN = 0xFF6B5441;
  private static final int MUTED = 0xFF9B7F64;
  private static final int ORANGE = 0xFFE9964F;
  private static final int GREEN = 0xFF5B8A63;
  private static final int RED = 0xFFC9564F;

  private final Handler handler = new Handler(Looper.getMainLooper());

  private TextView overlayState;
  private TextView notifState;
  private TextView patsState;
  private Button primaryBtn;
  private Button stopBtn;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    getWindow().setStatusBarColor(CREAM);
    getWindow().setNavigationBarColor(0xFFF1DDC5);
    if (Build.VERSION.SDK_INT >= 26) {
      getWindow().getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }

    ScrollView scroll = new ScrollView(this);
    scroll.setFillViewport(true);
    scroll.setBackgroundColor(CREAM);

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setPadding(dp(22), dp(26), dp(22), dp(28));
    root.setBackgroundColor(CREAM);
    scroll.addView(root, new ScrollView.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

    ImageView icon = new ImageView(this);
    icon.setImageResource(R.mipmap.ic_launcher);
    LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(96), dp(96));
    iconLp.gravity = Gravity.CENTER_HORIZONTAL;
    root.addView(icon, iconLp);

    TextView title = new TextView(this);
    title.setText("marmalade");
    title.setTextSize(30);
    title.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
    title.setTextColor(BROWN);
    title.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    titleLp.topMargin = dp(6);
    root.addView(title, titleLp);

    TextView subtitle = new TextView(this);
    subtitle.setText("a cat who lives over your apps");
    subtitle.setTextSize(14);
    subtitle.setTextColor(MUTED);
    subtitle.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    subLp.topMargin = dp(2);
    root.addView(subtitle, subLp);

    LinearLayout card = new LinearLayout(this);
    card.setOrientation(LinearLayout.VERTICAL);
    card.setPadding(dp(16), dp(4), dp(16), dp(4));
    card.setBackground(rounded(CARD, 18, BORDER));
    LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    cardLp.topMargin = dp(22);
    root.addView(card, cardLp);

    overlayState = valueView();
    notifState = valueView();
    patsState = valueView();

    addRow(card, "display over other apps", overlayState, true);
    addRow(card, "notifications", notifState, true);
    addRow(card, "pats given", patsState, false);

    notifState.setOnClickListener(v -> {
      if (Build.VERSION.SDK_INT >= 33
          && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
      }
    });

    primaryBtn = actionButton("let her out", ORANGE, Color.WHITE);
    LinearLayout.LayoutParams primaryLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
    primaryLp.topMargin = dp(18);
    root.addView(primaryBtn, primaryLp);

    stopBtn = actionButton("call her back", CARD, BROWN);
    stopBtn.setBackground(ripple(rounded(CARD, 14, BORDER)));
    LinearLayout.LayoutParams stopLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
    stopLp.topMargin = dp(10);
    root.addView(stopBtn, stopLp);

    TextView how = new TextView(this);
    how.setText("she floats above whatever you're using. tap her to pat, drag her anywhere, "
        + "and she keeps running until you stop her.");
    how.setTextSize(13);
    how.setTextColor(MUTED);
    how.setLineSpacing(dp(3), 1f);
    LinearLayout.LayoutParams howLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    howLp.topMargin = dp(20);
    root.addView(how, howLp);

    TextView stopNote = new TextView(this);
    stopNote.setText("to bring her in: use “Stop” on her notification, or “call her back” above.");
    stopNote.setTextSize(13);
    stopNote.setTextColor(BROWN);
    stopNote.setLineSpacing(dp(3), 1f);
    LinearLayout.LayoutParams noteLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    noteLp.topMargin = dp(12);
    root.addView(stopNote, noteLp);

    TextView battery = new TextView(this);
    battery.setText("if she disappears, battery optimisation put her to sleep. "
        + "exclude marmalade from battery optimisation to keep her out.");
    battery.setTextSize(12);
    battery.setTextColor(0xFFA98A6A);
    battery.setLineSpacing(dp(3), 1f);
    LinearLayout.LayoutParams batteryLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    batteryLp.topMargin = dp(14);
    root.addView(battery, batteryLp);

    TextView footer = new TextView(this);
    footer.setText("no internet · no account · pats stay on this phone");
    footer.setTextSize(11);
    footer.setTextColor(0xFFB49B80);
    footer.setGravity(Gravity.CENTER);
    LinearLayout.LayoutParams footerLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    footerLp.topMargin = dp(24);
    root.addView(footer, footerLp);

    primaryBtn.setOnClickListener(v -> launchPet());
    stopBtn.setOnClickListener(v -> {
      stopService(new Intent(this, PetService.class));
      Toast.makeText(this, "marmalade came back in", Toast.LENGTH_SHORT).show();
      handler.postDelayed(this::refresh, 350);
    });

    setContentView(scroll);
  }

  @Override
  protected void onResume() {
    super.onResume();
    refresh();
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    refresh();
  }

  private void launchPet() {
    if (!Settings.canDrawOverlays(this)) {
      openOverlaySettings();
      return;
    }

    if (Build.VERSION.SDK_INT >= 33
        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
    }

    Intent service = new Intent(this, PetService.class);
    if (Build.VERSION.SDK_INT >= 26) startForegroundService(service);
    else startService(service);

    Toast.makeText(this, "marmalade is out — stop her from the notification", Toast.LENGTH_LONG).show();
    moveTaskToBack(true);
  }

  private void openOverlaySettings() {
    try {
      Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:" + getPackageName()));
      startActivity(intent);
      Toast.makeText(this, "Allow “display over other apps”, then come back", Toast.LENGTH_LONG).show();
    } catch (Exception first) {
      try {
        startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION));
      } catch (Exception ignored) {
        Toast.makeText(this, "Open settings → apps → marmalade → display over other apps",
            Toast.LENGTH_LONG).show();
      }
    }
  }

  private void refresh() {
    boolean overlay = Settings.canDrawOverlays(this);
    overlayState.setText(overlay ? "allowed" : "not allowed");
    overlayState.setTextColor(overlay ? GREEN : RED);

    boolean notifications = true;
    if (Build.VERSION.SDK_INT >= 33) {
      notifications = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
          == PackageManager.PERMISSION_GRANTED;
    }
    notifState.setText(notifications ? "on" : "off");
    notifState.setTextColor(notifications ? GREEN : RED);

    SharedPreferences prefs = getSharedPreferences(PetService.PREFS, MODE_PRIVATE);
    patsState.setText(String.valueOf(prefs.getInt("pats", 0)));

    primaryBtn.setText(overlay ? "let her out" : "allow display over apps");
    stopBtn.setEnabled(PetService.running);
    stopBtn.setAlpha(PetService.running ? 1f : 0.45f);
  }

  private void addRow(LinearLayout parent, String label, TextView value, boolean divider) {
    if (divider) {
      View line = new View(this);
      line.setBackgroundColor(0xFFEFE1CD);
      LinearLayout.LayoutParams lineLp = new LinearLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT, dp(1));
      parent.addView(line, lineLp);
    }

    LinearLayout row = new LinearLayout(this);
    row.setOrientation(LinearLayout.HORIZONTAL);
    row.setGravity(Gravity.CENTER_VERTICAL);
    row.setPadding(0, dp(12), 0, dp(12));

    TextView name = new TextView(this);
    name.setText(label);
    name.setTextSize(13);
    name.setTextColor(MUTED);
    row.addView(name, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
    row.addView(value);

    parent.addView(row);
  }

  private TextView valueView() {
    TextView view = new TextView(this);
    view.setTextSize(13);
    view.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
    view.setTextColor(BROWN);
    view.setPadding(dp(8), 0, 0, 0);
    return view;
  }

  private Button actionButton(String text, int background, int foreground) {
    Button button = new Button(this);
    button.setText(text);
    button.setAllCaps(false);
    button.setTextSize(16);
    button.setTextColor(foreground);
    button.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
    button.setBackground(ripple(rounded(background, 14, 0)));
    button.setPadding(0, 0, 0, 0);
    button.setStateListAnimator(null);
    return button;
  }

  private GradientDrawable rounded(int color, int radiusDp, int strokeColor) {
    GradientDrawable shape = new GradientDrawable();
    shape.setColor(color);
    shape.setCornerRadius(dp(radiusDp));
    if (strokeColor != 0) shape.setStroke(dp(1), strokeColor);
    return shape;
  }

  private RippleDrawable ripple(GradientDrawable shape) {
    return new RippleDrawable(ColorStateList.valueOf(0x33000000), shape, null);
  }

  private int dp(int value) {
    return Math.round(value * getResources().getDisplayMetrics().density);
  }
}
