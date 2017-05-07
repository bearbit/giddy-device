#include "Giddy.h"

Giddy::Giddy() {
}

void Giddy::setup() {
    _displayController.setup();
}

void Giddy::process() {
    _displayController.process();
}