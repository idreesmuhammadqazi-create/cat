package com.marmalade.pet;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Toast;

public class PetService extends Service implements PetView.Listener {

  public static final String ACTION_STOP = "com.marmalade.pet.action.STOP";
  public static final String PREFS = "marmalade";
  public static volatile boolean running = false;

  private static final String CHANNEL_ID = "floating_cat";
  private static final int NOTIFICATION_ID = 42;

  private WindowManager windowManager;
  private PetView petView;
  private WindowManager.LayoutParams params;
  private int viewW;
  private int viewH;

  @Override
  public void onCreate() {
    super.onCreate();
    createChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && ACTION_STOP.equals(intent.getAction())) {
      stopSelf();
      return START_NOT_STICKY;
    }

    if (petView != null) return START_STICKY;

    if (!Settings.canDrawOverlays(this)) {
      Toast.makeText(this, "Allow “display over other apps” first", Toast.LENGTH_LONG).show();
      stopSelf();
      return START_NOT_STICKY;
    }

    startInForeground();

    windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    float density = getResources().getDisplayMetrics().density;
    viewW = Math.round(138 * density);
    viewH = Math.round(132 * density);

    petView = new PetView(this, this);
    params = new WindowManager.LayoutParams(
        viewW,
        viewH,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT);
    params.gravity = Gravity.TOP | Gravity.START;
    params.x = 40;
    params.y = 200;

    try {
      windowManager.addView(petView, params);
    } catch (Exception e) {
      Toast.makeText(this, "Could not place her on screen", Toast.LENGTH_LONG).show();
      stopSelf();
      return START_NOT_STICKY;
    }

    running = true;
    applyBounds();
    petView.start();
    return START_STICKY;
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    if (petView != null) {
      float density = getResources().getDisplayMetrics().density;
      viewW = Math.round(138 * density);
      viewH = Math.round(132 * density);
      params.width = viewW;
      params.height = viewH;
      applyBounds();
      petView.requestLayout();
    }
  }

  @SuppressWarnings("deprecation")
  private void applyBounds() {
    if (windowManager == null || petView == null) return;

    DisplayMetrics dm = new DisplayMetrics();
    windowManager.getDefaultDisplay().getRealMetrics(dm);
    float density = getResources().getDisplayMetrics().density;
    int padX = Math.round(4 * density);
    int padTop = Math.round(28 * density);
    int padBottom = Math.round(44 * density);

    int minX = padX;
    int maxX = Math.max(minX, dm.widthPixels - viewW - padX);
    int minY = padTop;
    int maxY = Math.max(minY, dm.heightPixels - viewH - padBottom);

    petView.setBounds(minX, maxX, minY, maxY);
  }

  private void startInForeground() {
    Intent open = new Intent(this, MainActivity.class);
    PendingIntent contentIntent = PendingIntent.getActivity(
        this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

    Intent stop = new Intent(this, PetService.class).setAction(ACTION_STOP);
    PendingIntent stopIntent = PendingIntent.getService(
        this, 1, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

    Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_stat_cat)
        .setContentTitle(getString(R.string.notif_title))
        .setContentText(getString(R.string.notif_text))
        .setContentIntent(contentIntent)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setCategory(Notification.CATEGORY_SERVICE)
        .addAction(0, getString(R.string.stop), stopIntent);

    if (Build.VERSION.SDK_INT >= 31) {
      builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
    }

    Notification notification = builder.build();

    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
      } else {
        startForeground(NOTIFICATION_ID, notification);
      }
    } catch (Exception e) {
      stopSelf();
    }
  }

  private void createChannel() {
    NotificationManager nm = getSystemService(NotificationManager.class);
    if (nm == null) return;

    NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        getString(R.string.channel_name),
        NotificationManager.IMPORTANCE_LOW);
    channel.setDescription(getString(R.string.channel_desc));
    channel.setShowBadge(false);
    nm.createNotificationChannel(channel);
  }

  @Override
  public void onWindowPosition(int x, int y) {
    if (windowManager == null || petView == null || params == null) return;
    if (params.x == x && params.y == y) return;
    params.x = x;
    params.y = y;
    try {
      windowManager.updateViewLayout(petView, params);
    } catch (IllegalArgumentException ignored) {
      // view is being removed
    }
  }

  @Override
  public void onPat() {
    SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    prefs.edit().putInt("pats", prefs.getInt("pats", 0) + 1).apply();
  }

  @Override
  public void onDestroy() {
    running = false;
    if (petView != null) {
      petView.stop();
      try {
        windowManager.removeView(petView);
      } catch (Exception ignored) {
        // already gone
      }
      petView = null;
    }
    stopForeground(true);
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
