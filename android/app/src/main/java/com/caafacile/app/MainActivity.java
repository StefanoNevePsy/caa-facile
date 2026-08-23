package com.caafacile.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // I plugin definiti dentro l'app vanno registrati prima di super.onCreate:
        // dopo, il bridge e' gia' stato costruito e non li vedrebbe.
        registerPlugin(PrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
