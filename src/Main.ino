#include <SPI.h>
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

#define __CS 10
#define __RST 12
#define __DC 9

TFT_ILI9163C tft = TFT_ILI9163C(__CS, __DC, __RST);

void setup(void) {
  tft.begin(SPISettings(16000000, MSBFIRST, SPI_MODE0));
  tft.setTextColor(WHITE, BLACK);
  Serial.begin(9600);
}

void loop() {
  tft.fillRect(0, 0, 128, 128, YELLOW);
  delay(500);
  tft.fillRect(0, 0, 128, 128, BLUE);
  delay(500);
}


