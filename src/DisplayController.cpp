#include "DisplayController.h"

DisplayController::DisplayController() {
}

void DisplayController::setup() {
    _tft.begin(SPISettings(16000000, MSBFIRST, SPI_MODE0));
    _tft.setTextColor(WHITE, BLACK);
}

void DisplayController::process() {
    _tft.fillRect(0, 0, 128, 128, YELLOW);
    delay(500);
    _tft.fillRect(0, 0, 128, 128, RED);
    delay(500);
}