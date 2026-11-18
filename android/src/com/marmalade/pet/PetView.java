package com.marmalade.pet;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.view.Choreographer;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class PetView extends View {

  public interface Listener {
    void onWindowPosition(int x, int y);
    void onPat();
  }

  private static final int FUR = 0xFFE9964F;
  private static final int FUR_DARK = 0xFFCF7B3A;
  private static final int FUR_STRIPE = 0xFFC87330;
  private static final int CREAM = 0xFFFFF1DD;
  private static final int INK = 0xFF3A2517;
  private static final int PINK = 0xFFF0B0A0;
  private static final int NOSE = 0xFFCF7163;
  private static final int WHISKER = 0xFF8A6A4E;

  private static final String[] PURR = {"purr…", "mrrp!", "prrr", "^_^", "mew"};

  private final Listener listener;
  private final Random random = new Random();
  private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Path path = new Path();
  private final RectF rect = new RectF();
  private final List<Heart> hearts = new ArrayList<>();
  private final float density;
  private final int slop;

  private float x;
  private float y;
  private float tx;
  private float ty;
  private int minX;
  private int maxX;
  private int minY;
  private int maxY;
  private boolean boundsReady;
  private boolean started;

  private boolean touching;
  private boolean dragging;
  private float downRawX;
  private float downRawY;
  private float startX;
  private float startY;

  private int direction = 1;
  private float phase;
  private float clock;
  private float speed;
  private long pausedUntil;
  private long patUntil;
  private long blinkUntil;
  private long nextBlink;
  private long bubbleUntil;
  private String bubble;
  private long lastNanos;
  private int lastPushX = Integer.MIN_VALUE;
  private int lastPushY = Integer.MIN_VALUE;

  private static class Heart {
    float x;
    float y;
    float vx;
    float vy;
    float life;
    float max;
    float size;
  }

  private final Choreographer.FrameCallback frame = new Choreographer.FrameCallback() {
    @Override
    public void doFrame(long frameTimeNanos) {
      if (!started) return;
      long now = System.nanoTime();
      float dt = (now - lastNanos) / 1_000_000_000f;
      lastNanos = now;
      if (dt <= 0f || dt > 0.1f) dt = 0.016f;
      step(dt);
      invalidate();
      if (started) Choreographer.getInstance().postFrameCallback(this);
    }
  };

  public PetView(Context context, Listener listener) {
    super(context);
    this.listener = listener;
    density = getResources().getDisplayMetrics().density;
    slop = ViewConfiguration.get(context).getScaledTouchSlop();
    setFocusable(false);
    setClickable(true);
    setContentDescription("marmalade, tap to pat");
    setBackgroundColor(Color.TRANSPARENT);
    textPaint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
    nextBlink = SystemClock.uptimeMillis() + 2400;
  }

  public void start() {
    if (started) return;
    started = true;
    lastNanos = System.nanoTime();
    Choreographer.getInstance().postFrameCallback(frame);
  }

  public void stop() {
    started = false;
    Choreographer.getInstance().removeFrameCallback(frame);
    hearts.clear();
  }

  public void setBounds(int minX, int maxX, int minY, int maxY) {
    this.minX = minX;
    this.maxX = Math.max(minX, maxX);
    this.minY = minY;
    this.maxY = Math.max(minY, maxY);

    if (!boundsReady) {
      boundsReady = true;
      x = minX + random.nextFloat() * (this.maxX - minX);
      y = minY + (this.maxY - minY) * 0.72f;
      tx = x;
      ty = y;
      pushPosition(true);
      pickTarget();
      return;
    }

    x = clamp(x, this.minX, this.maxX);
    y = clamp(y, this.minY, this.maxY);
    pushPosition(true);
    pickTarget();
  }

  private void step(float dt) {
    if (!boundsReady) return;

    clock += dt;
    long now = SystemClock.uptimeMillis();

    if (now >= nextBlink) {
      blinkUntil = now + 120;
      nextBlink = now + 2200 + random.nextInt(3600);
    }
    if (bubble != null && now > bubbleUntil) bubble = null;

    if (!touching && now >= patUntil && now >= pausedUntil) {
      float dx = tx - x;
      float dy = ty - y;
      float dist = (float) Math.hypot(dx, dy);

      if (dist < 5f) {
        if (random.nextInt(100) < 24) {
          pausedUntil = now + 260 + random.nextInt(700);
        } else {
          pickTarget();
        }
      } else {
        float step = Math.min(speed * dt, dist);
        x += dx / dist * step;
        y += dy / dist * step;
        if (Math.abs(dx) > 0.8f) direction = dx > 0f ? 1 : -1;
        phase += dt * (6.5f + (speed / density) * 0.045f);
        pushPosition(false);
      }
    }

    for (int i = hearts.size() - 1; i >= 0; i--) {
      Heart heart = hearts.get(i);
      heart.x += heart.vx * dt;
      heart.y += heart.vy * dt;
      heart.vy += 34f * dt;
      heart.life -= dt;
      if (heart.life <= 0f) hearts.remove(i);
    }
  }

  private void pickTarget() {
    float mid = (minX + maxX) / 2f;
    float nx = minX + random.nextFloat() * (maxX - minX);
    if (random.nextInt(100) < 60) {
      if (x < mid) nx = mid + random.nextFloat() * (maxX - mid);
      else nx = minX + random.nextFloat() * (mid - minX);
    }
    tx = nx;
    ty = minY + random.nextFloat() * (maxY - minY);
    speed = (92 + random.nextInt(118)) * density;
    if (random.nextInt(100) < 14) speed *= 1.5f;
  }

  private void pushPosition(boolean force) {
    int ix = Math.round(x);
    int iy = Math.round(y);
    if (force || ix != lastPushX || iy != lastPushY) {
      lastPushX = ix;
      lastPushY = iy;
      if (listener != null) listener.onWindowPosition(ix, iy);
    }
  }

  @Override
  public boolean onTouchEvent(MotionEvent event) {
    switch (event.getActionMasked()) {
      case MotionEvent.ACTION_DOWN:
        downRawX = event.getRawX();
        downRawY = event.getRawY();
        startX = x;
        startY = y;
        dragging = false;
        touching = true;
        return true;

      case MotionEvent.ACTION_MOVE:
        float dx = event.getRawX() - downRawX;
        float dy = event.getRawY() - downRawY;
        if (!dragging && Math.hypot(dx, dy) > slop) dragging = true;
        if (dragging) {
          x = clamp(startX + dx, minX, maxX);
          y = clamp(startY + dy, minY, maxY);
          if (Math.abs(dx) > 2f) direction = dx > 0f ? 1 : -1;
          pushPosition(false);
        }
        return true;

      case MotionEvent.ACTION_UP:
        touching = false;
        if (dragging) {
          dragging = false;
          pickTarget();
        } else {
          pat();
        }
        return true;

      case MotionEvent.ACTION_CANCEL:
        touching = false;
        dragging = false;
        pickTarget();
        return true;

      default:
        return super.onTouchEvent(event);
    }
  }

  private void pat() {
    long now = SystemClock.uptimeMillis();
    patUntil = now + 950;
    bubble = PURR[random.nextInt(PURR.length)];
    bubbleUntil = now + 1400;
    spawnHearts();
    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
    if (listener != null) listener.onPat();
    invalidate();
  }

  private void spawnHearts() {
    float hx = getWidth() * (direction > 0 ? 0.7f : 0.3f);
    float hy = getHeight() * 0.52f;
    for (int i = 0; i < 3 + random.nextInt(3); i++) {
      Heart heart = new Heart();
      heart.x = hx + (random.nextFloat() - 0.5f) * 50f * density;
      heart.y = hy + (random.nextFloat() - 0.5f) * 16f * density;
      heart.vx = (random.nextFloat() - 0.5f) * 34f * density;
      heart.vy = -(42f + random.nextFloat() * 40f) * density;
      heart.max = 0.85f + random.nextFloat() * 0.5f;
      heart.life = heart.max;
      heart.size = (7f + random.nextFloat() * 5f) * density;
      hearts.add(heart);
    }
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
    float w = getWidth();
    float h = getHeight();
    if (w <= 0f || h <= 0f) return;

    long now = SystemClock.uptimeMillis();
    boolean moving = !touching && now >= pausedUntil && now >= patUntil;
    boolean happy = now < patUntil;
    boolean blinking = now < blinkUntil;

    float s = Math.min(w / 112f, h / 100f);
    float ox = (w - 100f * s) / 2f;
    float oy = h - 80f * s - 2f * density;

    canvas.save();
    canvas.translate(ox, oy);
    canvas.scale(s, s);
    if (direction < 0) {
      canvas.translate(100f, 0f);
      canvas.scale(-1f, 1f);
    }
    drawCat(canvas, moving, happy, blinking);
    canvas.restore();

    drawHearts(canvas);
    drawBubble(canvas);
  }

  private void drawCat(Canvas c, boolean moving, boolean happy, boolean blinking) {
    paint.setStyle(Paint.Style.FILL);
    paint.setColor(0x335A3A20);
    rect.set(22f, 72f, 78f, 78f);
    c.drawOval(rect, paint);

    float bob = moving
        ? (float) Math.sin(phase * 2f) * 1.4f
        : (float) Math.sin(clock * 1.5f) * 0.5f;

    c.save();
    c.translate(0f, bob);

    float tailAngle = (float) Math.sin(clock * (happy ? 5.4f : 2.1f)) * (happy ? 12f : 8f);
    c.save();
    c.rotate(tailAngle, 28f, 55f);
    path.reset();
    path.moveTo(28f, 55f);
    path.cubicTo(18f, 57f, 10f, 51f, 11f, 41f);
    path.cubicTo(11.6f, 34.5f, 15.2f, 30.4f, 19f, 27f);
    paint.setStyle(Paint.Style.STROKE);
    paint.setStrokeWidth(7.5f);
    paint.setStrokeCap(Paint.Cap.ROUND);
    paint.setColor(FUR);
    c.drawPath(path, paint);
    paint.setStyle(Paint.Style.FILL);
    paint.setColor(CREAM);
    c.drawCircle(19.4f, 27f, 3.4f, paint);
    c.restore();

    float gait = moving ? (float) Math.sin(phase) * 16f : 0f;
    drawLeg(c, 28f, gait, FUR_DARK);
    drawLeg(c, 38f, -gait, FUR_DARK);

    paint.setStyle(Paint.Style.FILL);
    paint.setColor(FUR);
    rect.set(23f, 38f, 73f, 66f);
    c.drawOval(rect, paint);

    paint.setStyle(Paint.Style.STROKE);
    paint.setStrokeWidth(2.6f);
    paint.setStrokeCap(Paint.Cap.ROUND);
    paint.setColor(FUR_STRIPE);
    stripe(c, 36f, 40.5f, 37.2f, 48f);
    stripe(c, 45f, 38.5f, 46.2f, 46.5f);
    stripe(c, 54f, 38.5f, 55.2f, 46.5f);

    drawLeg(c, 55f, -gait, FUR);
    drawLeg(c, 65f, gait, FUR);

    drawHead(c, happy, blinking);
    c.restore();
  }

  private void stripe(Canvas c, float x1, float y1, float x2, float y2) {
    path.reset();
    path.moveTo(x1, y1);
    path.quadTo(x1 + 1.8f, (y1 + y2) / 2f, x2, y2);
    c.drawPath(path, paint);
  }

  private void drawLeg(Canvas c, float x, float angle, int color) {
    paint.setStyle(Paint.Style.FILL);
    paint.setColor(color);
    c.save();
    c.rotate(angle, x + 4f, 54f);
    rect.set(x, 54f, x + 8f, 74f);
    c.drawRoundRect(rect, 4f, 4f, paint);
    c.restore();
  }

  private void drawHead(Canvas c, boolean happy, boolean blinking) {
    paint.setStyle(Paint.Style.FILL);
    paint.setColor(FUR);

    path.reset();
    path.moveTo(63f, 28f);
    path.lineTo(66f, 12f);
    path.lineTo(78f, 24f);
    path.close();
    c.drawPath(path, paint);

    path.reset();
    path.moveTo(79f, 23f);
    path.lineTo(89f, 12f);
    path.lineTo(90.5f, 28f);
    path.close();
    c.drawPath(path, paint);

    paint.setColor(PINK);
    path.reset();
    path.moveTo(66.5f, 25f);
    path.lineTo(68f, 17f);
    path.lineTo(74.5f, 24f);
    path.close();
    c.drawPath(path, paint);

    path.reset();
    path.moveTo(81.5f, 24f);
    path.lineTo(85f, 17f);
    path.lineTo(88.5f, 24.5f);
    path.close();
    c.drawPath(path, paint);

    paint.setColor(FUR);
    rect.set(59f, 21.5f, 93f, 52.5f);
    c.drawOval(rect, paint);

    paint.setColor(CREAM);
    rect.set(67.5f, 37.5f, 86.5f, 50.5f);
    c.drawOval(rect, paint);

    if (happy || blinking) {
      paint.setStyle(Paint.Style.STROKE);
      paint.setStrokeWidth(2.2f);
      paint.setStrokeCap(Paint.Cap.ROUND);
      paint.setColor(INK);

      path.reset();
      path.moveTo(67f, 36f);
      path.quadTo(70f, happy ? 32.5f : 34.4f, 73f, 36f);
      c.drawPath(path, paint);

      path.reset();
      path.moveTo(80f, 36f);
      path.quadTo(83f, happy ? 32.5f : 34.4f, 86f, 36f);
      c.drawPath(path, paint);
    } else {
      paint.setStyle(Paint.Style.FILL);
      paint.setColor(INK);
      rect.set(67.4f, 31.6f, 72.6f, 38.4f);
      c.drawOval(rect, paint);
      rect.set(80.4f, 31.6f, 85.6f, 38.4f);
      c.drawOval(rect, paint);

      paint.setColor(0xFFFFFFFF);
      c.drawCircle(70.9f, 33.8f, 0.9f, paint);
      c.drawCircle(83.9f, 33.8f, 0.9f, paint);
    }

    paint.setStyle(Paint.Style.FILL);
    paint.setColor(NOSE);
    path.reset();
    path.moveTo(74.4f, 41f);
    path.lineTo(79.6f, 41f);
    path.lineTo(77f, 44.2f);
    path.close();
    c.drawPath(path, paint);

    paint.setStyle(Paint.Style.STROKE);
    paint.setStrokeWidth(1.3f);
    paint.setStrokeCap(Paint.Cap.ROUND);
    paint.setColor(INK);
    paint.setAlpha(190);

    path.reset();
    path.moveTo(77f, 44.2f);
    path.lineTo(77f, 45.8f);
    c.drawPath(path, paint);

    path.reset();
    path.moveTo(77f, 45.8f);
    path.quadTo(75.8f, 47.4f, 74.6f, 45.6f);
    c.drawPath(path, paint);

    path.reset();
    path.moveTo(77f, 45.8f);
    path.quadTo(78.2f, 47.4f, 79.4f, 45.6f);
    c.drawPath(path, paint);

    paint.setColor(WHISKER);
    paint.setAlpha(150);
    paint.setStrokeWidth(0.9f);
    c.drawLine(85.5f, 41.5f, 96f, 39f, paint);
    c.drawLine(85.5f, 44.5f, 96.5f, 46f, paint);
    c.drawLine(68.5f, 41.5f, 58f, 39f, paint);
    c.drawLine(68.5f, 44.5f, 57.5f, 46f, paint);
    paint.setAlpha(255);
  }

  private void drawHearts(Canvas c) {
    for (Heart heart : hearts) {
      int alpha = (int) (255f * Math.min(1f, heart.life / 0.3f));
      paint.setStyle(Paint.Style.FILL);
      paint.setColor(0xFFDD4767);
      paint.setAlpha(alpha);

      c.save();
      c.translate(heart.x, heart.y);
      float scale = heart.size / 12f;
      c.scale(scale, scale);
      c.drawCircle(-3f, -2f, 3.4f, paint);
      c.drawCircle(3f, -2f, 3.4f, paint);
      path.reset();
      path.moveTo(-6f, -1f);
      path.lineTo(6f, -1f);
      path.lineTo(0f, 6f);
      path.close();
      c.drawPath(path, paint);
      c.restore();
    }
    paint.setAlpha(255);
  }

  private void drawBubble(Canvas c) {
    if (bubble == null) return;
    long now = SystemClock.uptimeMillis();
    float fade = Math.min(1f, (bubbleUntil - now) / 260f);
    if (fade <= 0f) return;

    textPaint.setTextSize(12f * density);
    textPaint.setColor(0xFF6B5441);
    textPaint.setAlpha((int) (255f * fade));

    float padding = 7f * density;
    float textWidth = textPaint.measureText(bubble);
    float bw = textWidth + padding * 2f;
    float bh = 19f * density;
    float left = Math.max(2f * density, getWidth() / 2f - bw / 2f);
    float top = Math.max(2f * density, getHeight() * 0.04f);

    paint.setStyle(Paint.Style.FILL);
    paint.setColor(0xFFFFFFFF);
    paint.setAlpha((int) (236f * fade));
    rect.set(left, top, left + bw, top + bh);
    c.drawRoundRect(rect, 8f * density, 8f * density, paint);

    path.reset();
    path.moveTo(left + bw * 0.36f, top + bh);
    path.lineTo(left + bw * 0.45f, top + bh + 6f * density);
    path.lineTo(left + bw * 0.54f, top + bh);
    path.close();
    c.drawPath(path, paint);

    textPaint.setAlpha((int) (255f * fade));
    c.drawText(bubble, left + padding, top + bh * 0.68f, textPaint);
    paint.setAlpha(255);
  }

  private static float clamp(float value, float min, float max) {
    return Math.max(min, Math.min(max, value));
  }
}
