import JSZip from 'jszip';
import { ExamBrowserConfig, GeneratedProjectFile } from '../types/exam';

function escapeKotlinString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function indentBlock(content: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return content
    .split('\n')
    .map((line) => (line.length > 0 ? `${prefix}${line}` : ''))
    .join('\n');
}

export function generateSettingsGradle(config: ExamBrowserConfig): string {
  const rootName = config.appName.replace(/[^a-zA-Z0-9_-]/g, '') || 'ExamBrowser';
  return `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${rootName}"
include ':app'`;
}

export function generateRootBuildGradle(): string {
  return `plugins {
    id 'com.android.application' version '8.2.2' apply false
    id 'org.jetbrains.kotlin.android' version '1.9.22' apply false
}`;
}

export function generateGradleProperties(): string {
  return `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true`;
}

export function generateAppBuildGradle(config: ExamBrowserConfig): string {
  return `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${config.applicationId}'
    compileSdk ${config.targetSdk}

    defaultConfig {
        applicationId "${config.applicationId}"
        minSdk ${config.minSdk}
        targetSdk ${config.targetSdk}
        versionCode ${config.versionCode}
        versionName "${escapeKotlinString(config.versionName)}"
    }

    buildTypes {
        release {
            minifyEnabled false
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'com.journeyapps:zxing-android-embedded:4.3.0'
}`;
}

export function generateAndroidManifest(config: ExamBrowserConfig): string {
  const lockTaskAttr = config.enableLockTask
    ? `\n            android:lockTaskMode="if_whitelisted"`
    : '';
  const orientationAttr =
    config.screenOrientation !== 'unspecified'
      ? `\n            android:screenOrientation="${config.screenOrientation}"`
      : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application
        android:allowBackup="false"
        android:label="${escapeXmlAttr(config.appName)}"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar"
        android:usesCleartextTraffic="${config.usesCleartextTraffic}">

        <activity
            android:name=".MainActivity"
            android:exported="true"${lockTaskAttr}
            android:resizeableActivity="${!config.enableAntiSplitScreen}"${orientationAttr}>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
}

export function generateActivityMainXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webViewUjian"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</RelativeLayout>`;
}

export function generateMainActivityKt(config: ExamBrowserConfig): string {
  const needsAlarm = config.enableAntiSplitScreen || config.enableOnStopAlarm;

  const flagSecureBlock = config.enableFlagSecure
    ? `
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )`
    : '';

  const lockTaskBlock = config.enableLockTask
    ? `
        try {
            startLockTask()
        } catch (e: Exception) {
            Toast.makeText(this, "Aktifkan Sematkan Layar (Screen Pinning)", Toast.LENGTH_LONG).show()
        }`
    : '';

  const multiWindowMethod = config.enableAntiSplitScreen
    ? `

    override fun onMultiWindowModeChanged(isInMultiWindowMode: Boolean) {
        super.onMultiWindowModeChanged(isInMultiWindowMode)
        if (isInMultiWindowMode && ujianAktif) {
            bunyikanAlarm()
            Toast.makeText(this, "DILARANG SPLIT SCREEN!", Toast.LENGTH_LONG).show()
            finishAffinity()
        }
    }`
    : '';

  const onStopMethod = config.enableOnStopAlarm
    ? `

    override fun onStop() {
        super.onStop()
        if (ujianAktif) {
            bunyikanAlarm()
        }
    }`
    : '';

  const alarmMethod = needsAlarm
    ? `

    private fun bunyikanAlarm() {
        toneGen?.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 3000)
    }`
    : '';

  const backProtectionCall = config.enableBackProtection ? '\n        setupBackButtonProtection()' : '';

  const backProtectionMethod = config.enableBackProtection
    ? `

    private fun setupBackButtonProtection() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                Toast.makeText(this@MainActivity, "${
                  config.enableVolumeDownExit
                    ? 'Tekan tombol Volume Bawah untuk keluar'
                    : 'Tombol kembali dinonaktifkan selama ujian'
                }", Toast.LENGTH_SHORT).show()
            }
        })
    }`
    : '';

  const volumeDownMethod = config.enableVolumeDownExit
    ? `

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            tampilkanDialogKeluar()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }`
    : '';

  return `package ${config.applicationId}

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager${
    needsAlarm
      ? `
import android.media.AudioManager
import android.media.ToneGenerator`
      : ''
  }
import android.os.Bundle
import android.util.Base64${config.enableVolumeDownExit ? '\nimport android.view.KeyEvent' : ''}${
    config.enableFlagSecure ? '\nimport android.view.WindowManager' : ''
  }
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast${config.enableBackProtection ? '\nimport androidx.activity.OnBackPressedCallback' : ''}
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val pinPengawas = "${escapeKotlinString(config.pinPengawas)}"
    private var ujianAktif = false${needsAlarm ? '\n    private var toneGen: ToneGenerator? = null' : ''}

    private val qrPrefix = "${escapeKotlinString(config.qrPrefix)}"
    private val secretHeader = mapOf("${escapeKotlinString(config.secretHeaderName)}" to "${escapeKotlinString(config.secretHeaderValue)}")

    private val barcodeLauncher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents == null) {
            Toast.makeText(this, "Scan dibatalkan", Toast.LENGTH_SHORT).show()
            tampilkanMenuScan()
        } else {
            prosesQrTerenkripsi(result.contents.trim())
        }
    }

    private val requestCameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            bukaKameraScanQR()
        } else {
            Toast.makeText(this, "Izin kamera wajib diaktifkan untuk scan QR Ujian!", Toast.LENGTH_LONG).show()
            tampilkanMenuScan()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)${flagSecureBlock}

        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webViewUjian)${needsAlarm ? '\n        toneGen = ToneGenerator(AudioManager.STREAM_ALARM, 100)' : ''}

        setupWebView()${backProtectionCall}
        tampilkanMenuScan()
    }

    private fun tampilkanMenuScan() {
        AlertDialog.Builder(this)
            .setTitle("${escapeKotlinString(config.appName)} Terkunci")
            .setMessage("Silakan pindai QR Code Ujian yang ditampilkan oleh pengawas.")
            .setCancelable(false)
            .setPositiveButton("Scan QR Ujian") { _, _ ->
                cekIzinKameraDanScan()
            }
            .show()
    }

    private fun cekIzinKameraDanScan() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            bukaKameraScanQR()
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun bukaKameraScanQR() {
        val options = ScanOptions().apply {
            setPrompt("Arahkan kamera ke QR Code Ujian")
            setBeepEnabled(true)
            setOrientationLocked(${config.screenOrientation !== 'unspecified'})
        }
        barcodeLauncher.launch(options)
    }

    private fun prosesQrTerenkripsi(qrData: String) {
        if (!qrData.startsWith(qrPrefix)) {
            Toast.makeText(this, "QR Code tidak valid atau bukan QR Ujian resmi!", Toast.LENGTH_LONG).show()
            tampilkanMenuScan()
            return
        }
        try {
            val encodedPart = qrData.removePrefix(qrPrefix)
            val decodedBytes = Base64.decode(encodedPart, Base64.DEFAULT)
            val urlAsli = String(decodedBytes, Charsets.UTF_8)
            mulaiKunciUjian(urlAsli)
        } catch (e: Exception) {
            Toast.makeText(this, "Gagal membaca enkripsi QR Code", Toast.LENGTH_SHORT).show()
            tampilkanMenuScan()
        }
    }

    private fun mulaiKunciUjian(url: String) {
        ujianAktif = true
        webView.loadUrl(url, secretHeader)${lockTaskBlock}
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            builtInZoomControls = false
            displayZoomControls = false
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                request?.url?.toString()?.let { nextUrl ->
                    view?.loadUrl(nextUrl, secretHeader)
                }
                return true
            }
        }
    }${multiWindowMethod}${onStopMethod}${alarmMethod}${backProtectionMethod}${volumeDownMethod}

    private fun tampilkanDialogKeluar() {
        val inputPin = EditText(this).apply {
            hint = "Masukkan PIN Pengawas"
        }

        AlertDialog.Builder(this)
            .setTitle("Akhiri Sesi Ujian")
            .setView(inputPin)
            .setPositiveButton("Keluar") { _, _ ->
                if (inputPin.text.toString() == pinPengawas) {
                    ujianAktif = false
                    try { stopLockTask() } catch (_: Exception) {}
                    finishAffinity()
                } else {
                    Toast.makeText(this, "PIN Salah!", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }
}`;
}

export function generateGitHubWorkflowYaml(config: ExamBrowserConfig): string {
  const pkgPath = config.applicationId.replace(/\./g, '/');
  const branchesList = config.triggerBranches
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean)
    .join(', ');
  const safeBranches = branchesList || 'main, master, utama';

  const settingsGradle = indentBlock(generateSettingsGradle(config), 10);
  const rootBuildGradle = indentBlock(generateRootBuildGradle(), 10);
  const gradleProps = indentBlock(generateGradleProperties(), 10);
  const appBuildGradle = indentBlock(generateAppBuildGradle(config), 10);
  const manifest = indentBlock(generateAndroidManifest(config), 10);
  const layoutXml = indentBlock(generateActivityMainXml(), 10);
  const mainActivity = indentBlock(generateMainActivityKt(config), 10);

  return `name: Build ExamBrowser APK Otomatis

on:
  push:
    branches: [ ${safeBranches} ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repositori
        uses: actions/checkout@v4

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK & Gradle
        uses: android-actions/setup-android@v3

      - name: Buat Struktur Proyek & Build APK
        run: |
          mkdir -p app/src/main/java/${pkgPath}
          mkdir -p app/src/main/res/layout

          cat << 'EOF' > settings.gradle
${settingsGradle}
          EOF

          cat << 'EOF' > build.gradle
${rootBuildGradle}
          EOF

          cat << 'EOF' > gradle.properties
${gradleProps}
          EOF

          cat << 'EOF' > app/build.gradle
${appBuildGradle}
          EOF

          cat << 'EOF' > app/src/main/AndroidManifest.xml
${manifest}
          EOF

          cat << 'EOF' > app/src/main/res/layout/activity_main.xml
${layoutXml}
          EOF

          cat << 'EOF' > app/src/main/java/${pkgPath}/MainActivity.kt
${mainActivity}
          EOF

          gradle assembleDebug --no-daemon

      - name: Upload APK Siap Instal
        uses: actions/upload-artifact@v4
        with:
          name: ExamBrowser-APK
          path: app/build/outputs/apk/debug/app-debug.apk
`;
}

export function generateAllProjectFiles(config: ExamBrowserConfig): GeneratedProjectFile[] {
  const pkgPath = config.applicationId.replace(/\./g, '/');
  return [
    {
      path: '.github/workflows/build.yml',
      label: 'build.yml (Workflow)',
      language: 'yaml',
      content: generateGitHubWorkflowYaml(config),
    },
    {
      path: `app/src/main/java/${pkgPath}/MainActivity.kt`,
      label: 'MainActivity.kt',
      language: 'kotlin',
      content: generateMainActivityKt(config),
    },
    {
      path: 'app/src/main/AndroidManifest.xml',
      label: 'AndroidManifest.xml',
      language: 'xml',
      content: generateAndroidManifest(config),
    },
    {
      path: 'app/build.gradle',
      label: 'app/build.gradle',
      language: 'gradle',
      content: generateAppBuildGradle(config),
    },
    {
      path: 'app/src/main/res/layout/activity_main.xml',
      label: 'activity_main.xml',
      language: 'xml',
      content: generateActivityMainXml(),
    },
    {
      path: 'settings.gradle',
      label: 'settings.gradle',
      language: 'gradle',
      content: generateSettingsGradle(config),
    },
    {
      path: 'build.gradle',
      label: 'build.gradle',
      language: 'gradle',
      content: generateRootBuildGradle(),
    },
    {
      path: 'gradle.properties',
      label: 'gradle.properties',
      language: 'properties',
      content: generateGradleProperties(),
    },
  ];
}

export function generateServerGuardSnippets(config: ExamBrowserConfig): Record<'php' | 'express' | 'nginx' | 'cloudflare', string> {
  const headerName = config.secretHeaderName;
  const headerValue = config.secretHeaderValue;
  const phpKey = 'HTTP_' + headerName.toUpperCase().replace(/-/g, '_');
  const nginxVar = '$http_' + headerName.toLowerCase().replace(/-/g, '_');

  return {
    php: `<?php
// Letakkan di bagian paling atas halaman ujian (CBT / Moodle / portal ujian)
$expected = '${headerValue}';
$actual = $_SERVER['${phpKey}'] ?? '';

if ($actual !== $expected) {
    http_response_code(403);
    exit('Akses ditolak. Gunakan aplikasi resmi ${config.appName}.');
}
?>`,
    express: `// Middleware Express.js untuk membatasi akses hanya dari ${config.appName}
import type { Request, Response, NextFunction } from 'express';

export function requireExamBrowser(req: Request, res: Response, next: NextFunction) {
  const token = req.header('${headerName}');
  if (token !== '${headerValue}') {
    return res.status(403).send('Akses ditolak. Silakan buka melalui ${config.appName}.');
  }
  next();
}`,
    nginx: `# Blokir browser biasa di konfigurasi server block Nginx
location /ujian/ {
    if (${nginxVar} != "${headerValue}") {
        return 403;
    }
    proxy_pass http://127.0.0.1:8080;
}`,
    cloudflare: `// Cloudflare Worker sebagai gerbang verifikasi header ujian
export default {
  async fetch(request) {
    const token = request.headers.get('${headerName}');
    if (token !== '${headerValue}') {
      return new Response('Akses hanya diizinkan melalui ${config.appName}.', {
        status: 403,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    return fetch(request);
  },
};`,
  };
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadAndroidProjectZip(config: ExamBrowserConfig): Promise<void> {
  const zip = new JSZip();
  const files = generateAllProjectFiles(config);

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const readme = `# ${config.appName}

Proyek Android ExamBrowser ini dibuat dari ExamBrowser Studio.

## Konfigurasi Aktif
- Application ID: \`${config.applicationId}\`
- Versi: \`${config.versionName}\` (versionCode ${config.versionCode})
- PIN Pengawas: \`${config.pinPengawas}\`
- Prefix QR: \`${config.qrPrefix}\`
- Header Rahasia: \`${config.secretHeaderName}: ${config.secretHeaderValue}\`

## Cara Build APK Otomatis di GitHub Actions
1. Buat repositori baru di GitHub.
2. Unggah seluruh isi folder ini (termasuk \`.github/workflows/build.yml\`).
3. Buka tab **Actions** pada repositori GitHub.
4. Klik workflow **Build ExamBrowser APK Otomatis** -> **Run workflow**.
5. Setelah selesai, unduh file \`ExamBrowser-APK\` pada bagian **Artifacts**.
`;

  zip.file('README.md', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const slug = config.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'exambrowser';
  link.download = `${slug}-android-project.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
