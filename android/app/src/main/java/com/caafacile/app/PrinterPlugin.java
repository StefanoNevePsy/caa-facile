package com.caafacile.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte verso il sistema di stampa di Android.
 *
 * La WebView di Android non implementa `window.print()`: la chiamata non fa
 * assolutamente nulla e non produce nemmeno un errore, quindi dentro l'app
 * installata il tasto Stampa risultava morto. Nel browser invece funziona.
 *
 * La strada corretta e' `PrintManager` con l'adattatore prodotto dalla WebView
 * stessa: usa la pipeline di stampa del sistema, che comprende gratuitamente
 * anche "Salva come PDF".
 */
@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        final String nome = call.getString("name", "CAA Facile");
        final String orientamento = call.getString("orientation", "portrait");

        // PrintManager va toccato dal thread dell'interfaccia, come la WebView.
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge().getWebView();
                    if (webView == null) {
                        call.reject("WebView non disponibile");
                        return;
                    }

                    PrintManager printManager =
                            (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                    if (printManager == null) {
                        call.reject("Servizio di stampa non disponibile su questo dispositivo");
                        return;
                    }

                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(nome);

                    // `@page { size: A4 landscape }` non viene letto dall'adattatore
                    // della WebView: il verso del foglio va imposto qui, altrimenti
                    // il selettore Vert./Orizz. dell'app non avrebbe effetto.
                    PrintAttributes.Builder attributi = new PrintAttributes.Builder();
                    attributi.setMediaSize(
                            "landscape".equals(orientamento)
                                    ? PrintAttributes.MediaSize.ISO_A4.asLandscape()
                                    : PrintAttributes.MediaSize.ISO_A4.asPortrait());
                    attributi.setMinMargins(PrintAttributes.Margins.NO_MARGINS);

                    printManager.print(nome, adapter, attributi.build());
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Stampa non riuscita: " + e.getMessage(), e);
                }
            }
        });
    }
}
