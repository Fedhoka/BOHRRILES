package com.bohr.bohrriles

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.integration.android.IntentIntegrator
import com.google.zxing.integration.android.IntentResult

/**
 * Base class for all barrel-operation activities.
 * Provides ZXing scanning helpers and session access.
 */
abstract class BaseBarrilActivity : AppCompatActivity() {

    protected lateinit var session: SessionManager
    protected var scanCallback: ((String) -> Unit)? = null

    override fun onResume() {
        super.onResume()
        session = SessionManager(this)
    }

    /** Launch ZXing scanner. Result delivered to [onScanResult]. */
    protected fun launchScanner() {
        IntentIntegrator(this).apply {
            setDesiredBarcodeFormats(
                IntentIntegrator.EAN_8,
                IntentIntegrator.EAN_13,
                IntentIntegrator.UPC_A,
                IntentIntegrator.UPC_E
            )
            setPrompt("Apuntá la cámara al código de barras del barril")
            setBeepEnabled(true)
            setOrientationLocked(true)
            initiateScan()
        }
    }

    /** Override to handle scan result. */
    protected open fun onScanResult(code: String) {}

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val result: IntentResult = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (result.contents != null) {
            onScanResult(result.contents)
        } else {
            @Suppress("DEPRECATION")
            super.onActivityResult(requestCode, resultCode, data)
        }
    }
}
