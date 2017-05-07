#ifndef DisplayController_h
#define DisplayController_h

#include "Settings.h"
#include <Adafruit_GFX.h>
#include <TFT_ILI9163C.h>

// Color definitions
#define	BLACK   0x0000
#define	BLUE    0x001F
#define	RED     0xF800
#define	GREEN   0x07E0
#define CYAN    0x07FF
#define MAGENTA 0xF81F
#define YELLOW  0xFFE0  
#define WHITE   0xFFFF

class DisplayController {
    public:
        DisplayController();
        void setup();
        void process();
    private:
        TFT_ILI9163C _tft = TFT_ILI9163C(__CS, __DC, __RST);
};

#endif