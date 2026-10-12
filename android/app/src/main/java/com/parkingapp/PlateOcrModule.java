package com.parkingapp;

import android.net.Uri;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;

import java.io.File;
import java.io.IOException;

public class PlateOcrModule extends ReactContextBaseJavaModule {
  public PlateOcrModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "PlateOcr";
  }

  @ReactMethod
  public void recognize(String path, Promise promise) {
    try {
      String cleanPath = path == null ? "" : path.replace("file://", "");
      InputImage image = InputImage.fromFilePath(
          getReactApplicationContext(),
          Uri.fromFile(new File(cleanPath)));

      TextRecognition.getClient()
          .process(image)
          .addOnSuccessListener(result -> promise.resolve(result.getText()))
          .addOnFailureListener(error -> promise.reject("OCR_FAILED", error));
    } catch (IOException error) {
      promise.reject("OCR_FAILED", error);
    }
  }
}
