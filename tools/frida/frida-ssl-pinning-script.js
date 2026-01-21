/* 
   Farmatodo Bypass Script v2.0
   - SSL Pinning Bypass (Java + Native)
   - Basic Root Detection Bypass
*/

Java.perform(function () {
    console.log("[*] Script loaded. Waiting for classes...");

    // --- 1. SSL Pinning Bypass (Standard) ---
    var array_list = Java.use("java.util.ArrayList");
    var ApiClient = Java.use('com.android.org.conscrypt.TrustManagerImpl');

    ApiClient.checkTrustedRecursive.implementation = function (a1, a2, a3, a4, a5, a6) {
        // console.log("[+] Bypassing SSL Pinning (Conscrypt)");
        return array_list.$new();
    }

    // --- 2. HttpsURLConnection Bypass ---
    try {
        var HttpsURLConnection = Java.use("javax.net.ssl.HttpsURLConnection");
        HttpsURLConnection.setDefaultHostnameVerifier.implementation = function (hostnameVerifier) {
            console.log("[+] Bypassing HttpsURLConnection.setDefaultHostnameVerifier");
            return null;
        };
        HttpsURLConnection.setSSLSocketFactory.implementation = function (SSLSocketFactory) {
            console.log("[+] Bypassing HttpsURLConnection.setSSLSocketFactory");
            return null;
        };
        HttpsURLConnection.setHostnameVerifier.implementation = function (hostnameVerifier) {
            console.log("[+] Bypassing HttpsURLConnection.setHostnameVerifier");
            return null;
        };
    } catch (err) {
        console.log("[-] HttpsURLConnection not found");
    }

    // --- 3. Root Detection Bypass (Basic) ---
    var RootPackages = ["com.noshufou.android.su", "com.noshufou.android.su.elite", "eu.chainfire.supersu",
        "com.koushikdutta.superuser", "com.thirdparty.superuser", "org.adaway", "com.lexa.fakegps"
    ];

    var File = Java.use("java.io.File");
    File.exists.implementation = function () {
        var name = this.getAbsolutePath();
        for (var i = 0; i < RootPackages.length; i++) {
            if (name.indexOf(RootPackages[i]) > -1) {
                console.log("[+] Hiding Root Package: " + name);
                return false;
            }
        }
        if (name.indexOf("/su") > -1 || name.indexOf("/system/bin/su") > -1 || name.indexOf("/system/xbin/su") > -1) {
            console.log("[+] Hiding SU Binary: " + name);
            return false;
        }
        return this.exists();
    };

    console.log("[+] Hooks applied. Ready to launch!");
});
