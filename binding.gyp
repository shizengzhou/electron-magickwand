{
  "variables": {
    "napi_version": 8,
    "module_name": "magickwand"
  },
  "targets": [
    {
      "includes": [
        "swig-sources.gypi"
      ],
      "target_name": "<(module_name)",
      "include_dirs": [
        ".",
        "<!@(node -p \"require('node-addon-api').include\")",
        "deps/ImageMagick/Magick++/lib",
        "deps/ImageMagick",
        "preconf"
      ],
      "defines": [
        "NAPI_VERSION=<(napi_version)",
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "MAGICKCORE_HDRI_ENABLE=1",
        "MAGICKCORE_QUANTUM_DEPTH=16"
      ],
      "conditions": [
        ["OS=='win'", {
          "defines": [
            "_CRT_SECURE_NO_WARNINGS",
            "NOMINMAX",
            "_WINDOWS",
            "WIN32"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [
                "/bigobj",
                "/std:c++17",
              ],
              "ExceptionHandling": "2",
              "RuntimeLibrary": "2"
            },
          },
          "msbuild_toolset": "v143",
          "libraries": [
            "<!@(node scripts/find-imagemagick.cjs libraries)",
            "bcrypt.lib"
          ],
          "library_dirs": [
            "<!@(node scripts/find-imagemagick.cjs libdir)"
          ]
        }],
        ["OS=='mac'", {
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "OTHER_CPLUSPLUSFLAGS": [
              "-std=c++17",
              "-stdlib=libc++"
            ],
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
          },
          "libraries": [
            "-L/opt/homebrew/lib",
            "-L/usr/local/lib",
            "-lMagick++-7.Q16HDRI",
            "-lMagickWand-7.Q16HDRI",
            "-lMagickCore-7.Q16HDRI"
          ]
        }],
        ["OS=='linux'", {
          "cflags_cc": [
            "-std=c++17"
          ],
          "ldflags": [
            "-Wl,-rpath,'$$ORIGIN'"
          ],
          "libraries": [
            "<!@(pkg-config --libs Magick++ 2>/dev/null || echo '-lMagick++-7.Q16HDRI -lMagickWand-7.Q16HDRI -lMagickCore-7.Q16HDRI -lpthread')"
          ],
          "cflags_cc!": [
            "<!@(pkg-config --cflags Magick++ 2>/dev/null || echo '')"
          ]
        }]
      ],
      "cflags_cc": [
        "-std=c++17"
      ],
      "defines!": [
        "_DEBUG"
      ]
    }
  ]
}
