plugins {
    id("com.android.application")
}

android {
    namespace = "com.coachcompany.sim"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.coachcompany.sim"
        minSdk = 26
        targetSdk = 35
        versionCode = 2005
        versionName = "0.20.5"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
