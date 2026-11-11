package expo.modules.gaavlispeechdialog

import android.content.Intent
import android.speech.RecognizerIntent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Opens the phone's own "Speak now" voice dialog (the Google app's) and
// returns what was said. Resolves { status: "ok", text }, { status: "cancelled" }
// or { status: "unavailable" } when no speech app can handle the request.
class GaavliSpeechDialogModule : Module() {
  private var pending: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("GaavliSpeechDialog")

    AsyncFunction("recognize") { language: String, prompt: String?, promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_WEB_SEARCH)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        if (!prompt.isNullOrBlank()) putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
      }
      if (intent.resolveActivity(activity.packageManager) == null) {
        promise.resolve(mapOf("status" to "unavailable"))
        return@AsyncFunction
      }
      pending?.resolve(mapOf("status" to "cancelled"))
      pending = promise
      try {
        activity.startActivityForResult(intent, REQUEST_CODE)
      } catch (error: Exception) {
        pending = null
        promise.resolve(mapOf("status" to "unavailable"))
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      val text = payload.data
        ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        ?.firstOrNull()
        ?.trim()
      if (payload.resultCode == android.app.Activity.RESULT_OK && !text.isNullOrEmpty()) {
        promise.resolve(mapOf("status" to "ok", "text" to text))
      } else {
        promise.resolve(mapOf("status" to "cancelled"))
      }
    }
  }

  companion object {
    private const val REQUEST_CODE = 7381
  }
}
