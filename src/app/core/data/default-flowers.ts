import type {FlowerDefinition} from '../models/flower.models';

// Wird über den lokalen Blumen-Editor erzeugt. Änderungen bitte im Editor speichern.
export const DEFAULT_FLOWERS: FlowerDefinition[] = [
  {
    "schemaVersion": 2,
    "id": "garden-rose",
    "name": "Gartenrose",
    "rootNodeId": "base",
    "stem": {
      "color": "#477348",
      "highlightColor": "#76a56e",
      "width": 10,
      "taper": 0.72
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "growth-loop",
            "repeat": {
              "min": 1,
              "max": 1
            },
            "length": {
              "min": 92,
              "max": 122
            },
            "angle": {
              "min": 0,
              "max": 7
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "growth-loop",
        "name": "Stängel mit Blättern",
        "draggable": false,
        "graphic": null,
        "loop": {
          "repeat": {
            "min": 2,
            "max": 3
          },
          "startNodeId": "stem",
          "endNodeId": "stem"
        },
        "connections": [
          {
            "childId": "bloom",
            "repeat": {
              "min": 1,
              "max": 1
            },
            "length": {
              "min": 36,
              "max": 48
            },
            "angle": {
              "min": 0,
              "max": 5
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "stem",
        "name": "Gewachsener Stängel",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "leaf",
            "repeat": {
              "min": 1,
              "max": 2
            },
            "length": {
              "min": 18,
              "max": 34
            },
            "angle": {
              "min": 48,
              "max": 74
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "leaf",
        "name": "Blattgrafik",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#477b49",
          "width": 50,
          "height": 44,
          "depth": 3,
          "start": {
            "x": 0,
            "y": 0.5
          },
          "end": {
            "x": 1,
            "y": 0.5
          },
          "rotation": {
            "min": -18,
            "max": 18
          }
        },
        "connections": []
      },
      {
        "id": "bloom",
        "name": "Blütenzentrum",
        "draggable": true,
        "graphic": {
          "primitive": "sphere",
          "color": "#8f2942",
          "width": 20,
          "height": 20,
          "depth": 5.279999999999999,
          "start": {
            "x": 0.5,
            "y": 0.5
          },
          "end": {
            "x": 0.5,
            "y": 0
          },
          "rotation": {
            "min": 0,
            "max": 0
          }
        },
        "connections": [
          {
            "childId": "petal",
            "repeat": {
              "min": 6,
              "max": 17
            },
            "length": {
              "min": 0,
              "max": 3
            },
            "angle": {
              "min": 64,
              "max": 64
            },
            "azimuth": {
              "min": 0,
              "max": 360
            },
            "randomness": 0
          }
        ]
      },
      {
        "id": "petal",
        "name": "Rosenblatt",
        "draggable": false,
        "graphic": {
          "primitive": "petal-round",
          "color": "#e75b71",
          "width": 43,
          "height": 72,
          "depth": 2,
          "start": {
            "x": 0.5,
            "y": 0.88
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": -180,
            "max": 180
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "growth-loop": {
          "x": 500,
          "y": 640
        },
        "base": {
          "x": 500,
          "y": 920
        },
        "stem": {
          "x": 500,
          "y": 640
        },
        "bloom": {
          "x": 500.4376567725751,
          "y": 360
        },
        "leaf": {
          "x": 333.3333333333333,
          "y": 80
        },
        "petal": {
          "x": 666.6666666666666,
          "y": 80
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "meadow-daisy",
    "name": "Margerite",
    "rootNodeId": "base",
    "stem": {
      "color": "#50835a",
      "highlightColor": "#88af78",
      "width": 7,
      "taper": 0.68
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "growth-loop",
            "repeat": {
              "min": 1,
              "max": 1
            },
            "length": {
              "min": 72,
              "max": 94
            },
            "angle": {
              "min": 0,
              "max": 5
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "growth-loop",
        "name": "Stängel mit Blättern",
        "draggable": false,
        "graphic": null,
        "loop": {
          "repeat": {
            "min": 3,
            "max": 4
          },
          "startNodeId": "stem",
          "endNodeId": "stem"
        },
        "connections": [
          {
            "childId": "flower-head",
            "repeat": {
              "min": 2,
              "max": 4
            },
            "length": {
              "min": 42,
              "max": 115
            },
            "angle": {
              "min": 12,
              "max": 42
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "stem",
        "name": "Stängel",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "leaf",
            "repeat": {
              "min": 1,
              "max": 2
            },
            "length": {
              "min": 20,
              "max": 34
            },
            "angle": {
              "min": 46,
              "max": 70
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "leaf",
        "name": "Blatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#5b8d53",
          "width": 68,
          "height": 38,
          "depth": 4.56,
          "start": {
            "x": 0,
            "y": 0.5
          },
          "end": {
            "x": 1,
            "y": 0.5
          },
          "rotation": {
            "min": -15,
            "max": 15
          }
        },
        "connections": []
      },
      {
        "id": "flower-head",
        "name": "Blütenkopf",
        "draggable": true,
        "graphic": {
          "primitive": "sphere",
          "color": "#e4b43f",
          "width": 34,
          "height": 34,
          "depth": 4.08,
          "start": {
            "x": 0.5,
            "y": 0.5
          },
          "end": {
            "x": 0.5,
            "y": 0
          },
          "rotation": {
            "min": 0,
            "max": 0
          }
        },
        "connections": [
          {
            "childId": "petal",
            "repeat": {
              "min": 12,
              "max": 16
            },
            "length": {
              "min": 0,
              "max": 1
            },
            "angle": {
              "min": 82,
              "max": 98
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "petal",
        "name": "Blütenblatt",
        "draggable": false,
        "graphic": {
          "primitive": "petal-round",
          "color": "#fffdf7",
          "width": 30,
          "height": 62,
          "depth": 3.5999999999999996,
          "start": {
            "x": 0.5,
            "y": 0.91
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": 0,
            "max": 0
          }
        },
        "connections": []
      }
    ]
  },
  {
    "schemaVersion": 2,
    "id": "lilac",
    "name": "Flieder",
    "rootNodeId": "base",
    "stem": {
      "color": "#426f50",
      "highlightColor": "#82a878",
      "width": 9,
      "taper": 0.62
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "growth-loop",
            "repeat": {
              "min": 1,
              "max": 1
            },
            "length": {
              "min": 70,
              "max": 88
            },
            "angle": {
              "min": 0,
              "max": 6
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "growth-loop",
        "name": "Stängel mit Blättern",
        "draggable": false,
        "graphic": null,
        "loop": {
          "repeat": {
            "min": 3,
            "max": 4
          },
          "startNodeId": "stem",
          "endNodeId": "stem"
        },
        "connections": [
          {
            "childId": "umbel",
            "repeat": {
              "min": 3,
              "max": 5
            },
            "length": {
              "min": 34,
              "max": 82
            },
            "angle": {
              "min": 18,
              "max": 48
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "stem",
        "name": "Hauptstängel",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "leaf",
            "repeat": {
              "min": 1,
              "max": 2
            },
            "length": {
              "min": 24,
              "max": 40
            },
            "angle": {
              "min": 48,
              "max": 74
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "leaf",
        "name": "Blatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-round",
          "color": "#477b55",
          "width": 70,
          "height": 41,
          "depth": 4.92,
          "start": {
            "x": 0,
            "y": 0.5
          },
          "end": {
            "x": 1,
            "y": 0.5
          },
          "rotation": {
            "min": -18,
            "max": 18
          }
        },
        "connections": []
      },
      {
        "id": "umbel",
        "name": "Doldenast",
        "draggable": true,
        "graphic": null,
        "connections": [
          {
            "childId": "sprig",
            "repeat": {
              "min": 3,
              "max": 5
            },
            "length": {
              "min": 22,
              "max": 45
            },
            "angle": {
              "min": 20,
              "max": 55
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "sprig",
        "name": "Blütenzweig",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "floret",
            "repeat": {
              "min": 3,
              "max": 6
            },
            "length": {
              "min": 7,
              "max": 23
            },
            "angle": {
              "min": 25,
              "max": 75
            },
            "azimuth": {
              "min": 0,
              "max": 360
            }
          }
        ]
      },
      {
        "id": "floret",
        "name": "Einzelblüte",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#a778c4",
          "width": 10,
          "height": 10,
          "depth": 10,
          "start": {
            "x": 0.5,
            "y": 0.5
          },
          "end": {
            "x": 0.5,
            "y": 0
          },
          "rotation": {
            "min": -20,
            "max": 20
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "growth-loop": {
          "x": 500,
          "y": 710
        },
        "base": {
          "x": 500,
          "y": 920
        },
        "stem": {
          "x": 500,
          "y": 710
        },
        "umbel": {
          "x": 500,
          "y": 500
        },
        "leaf": {
          "x": 333.3333333333333,
          "y": 290
        },
        "sprig": {
          "x": 666.6666666666666,
          "y": 290
        },
        "floret": {
          "x": 500,
          "y": 80
        }
      }
    }
  }
];
