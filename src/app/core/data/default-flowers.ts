import type {FlowerDefinition} from '../models/flower.models';

// Wird über den lokalen Blumen-Editor erzeugt. Änderungen bitte im Editor speichern.
export const DEFAULT_FLOWERS: FlowerDefinition[] = [
  {
    "schemaVersion": 2,
    "id": "garden-rose",
    "name": "Pfingstrose",
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
            "childId": "loop-1"
          }
        ]
      },
      {
        "id": "stem",
        "name": "Blatt-Hub",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "leaf"
          },
          {
            "childId": "node-6"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#477348",
            "width": 4,
            "startWidth": 3,
            "endWidth": 2,
            "bend": 0,
            "curve": 47,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      },
      {
        "id": "leaf",
        "name": "Blatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#477b49",
          "width": 30,
          "height": 44,
          "depth": 1,
          "start": {
            "x": 0,
            "y": 0.5
          },
          "end": {
            "x": 1,
            "y": 0.5
          },
          "rotation": {
            "min": 83,
            "max": 97
          },
          "bendMain": -60,
          "bendCross": 41,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 7
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 2
          },
          "length": {
            "min": 6,
            "max": 7
          },
          "angle": {
            "min": 58,
            "max": 74
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.27,
          "stem": {
            "color": "#477348",
            "width": 4,
            "startWidth": 3,
            "endWidth": 1,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      },
      {
        "id": "pfingstrosenbluete",
        "name": "Pfingstrosenblüte",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 12,
            "max": 12
          },
          "angle": {
            "min": 0,
            "max": 5
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "stem": {
            "color": "#477348",
            "width": 4,
            "startWidth": 3,
            "endWidth": 2,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [],
        "component": {
          "schemaVersion": 1,
          "id": "pfingstrosenbluete",
          "name": "Pfingstrosenblüte",
          "sourceDefinitionId": "pfingstrosenbluete"
        }
      },
      {
        "id": "loop-1",
        "name": "Stängel",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 50,
            "max": 70
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#477348",
            "width": 6.5,
            "bend": 0,
            "curve": 22
          }
        },
        "connections": [
          {
            "childId": "pfingstrosenbluete"
          }
        ],
        "loop": {
          "repeat": {
            "min": 2,
            "max": 2
          },
          "startNodeId": "loop-2",
          "endNodeId": "node-6",
          "memberNodeIds": [
            "loop-2",
            "stem",
            "leaf",
            "node-6"
          ],
          "continuationOutputNodeIds": [
            "node-6"
          ]
        }
      },
      {
        "id": "node-6",
        "name": "Out",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#477348",
            "width": 4,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "node-7",
        "name": "Dorn-Hub",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 10,
            "max": 15
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#477348",
            "width": 4,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "node-7-copy"
          },
          {
            "childId": "node-9"
          }
        ]
      },
      {
        "id": "node-7-copy",
        "name": "Dorn",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 10,
            "max": 12
          },
          "angle": {
            "min": 56,
            "max": 56
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 1,
          "stem": {
            "color": "#477348",
            "width": 3,
            "startWidth": 3,
            "endWidth": 1,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "node-9",
        "name": "Out",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#477348",
            "width": 4.5,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "loop-2",
        "name": "Dornen",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 50,
            "max": 70
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25
        },
        "connections": [
          {
            "childId": "stem"
          }
        ],
        "loop": {
          "repeat": {
            "min": 3,
            "max": 3
          },
          "startNodeId": "node-7",
          "endNodeId": "node-7-copy",
          "memberNodeIds": [
            "node-7",
            "node-7-copy",
            "node-9"
          ],
          "continuationOutputNodeIds": [
            "node-9"
          ]
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "loop-1": {
          "x": 500,
          "y": 591
        },
        "loop-2": {
          "x": 500,
          "y": 723
        },
        "base": {
          "x": 500,
          "y": 1073
        },
        "stem": {
          "x": 500,
          "y": 457
        },
        "node-7": {
          "x": 500,
          "y": 789
        },
        "leaf": {
          "x": 374,
          "y": 325
        },
        "node-6": {
          "x": 626,
          "y": 325
        },
        "node-7-copy": {
          "x": 374,
          "y": 657
        },
        "node-9": {
          "x": 626,
          "y": 657
        },
        "pfingstrosenbluete": {
          "x": 500,
          "y": 104
        }
      }
    },
    "catalogRole": "flower",
    "availableInBouquet": true,
    "availableAsComponent": true,
    "outputNodeIds": []
  },
  {
    "schemaVersion": 2,
    "id": "pfingstrosenbluete",
    "name": "Pfingstrosenblüte",
    "catalogRole": "component",
    "outputNodeIds": [],
    "rootNodeId": "bloom",
    "stem": {
      "color": "#477348",
      "highlightColor": "#76a56e",
      "width": 10,
      "taper": 0.72
    },
    "nodes": [
      {
        "id": "bloom",
        "name": "Blütenzentrum",
        "draggable": true,
        "graphic": null,
        "connections": [
          {
            "childId": "petal"
          },
          {
            "childId": "petal-copy"
          },
          {
            "childId": "petal-copy-copy"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 36,
            "max": 45
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
      },
      {
        "id": "petal",
        "name": "Rosenblätter Außen",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#e75b71",
          "width": 43,
          "height": 72,
          "depth": 2,
          "bendMain": 100,
          "bendCross": 31,
          "orientation": "toward-parent",
          "rotationBase": 89,
          "rotationSpread": 12,
          "start": {
            "x": 0.5,
            "y": 0.88
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": 77,
            "max": 101
          }
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 8,
            "max": 10
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 109,
            "max": 116
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        }
      },
      {
        "id": "petal-copy",
        "name": "Rosenblätter Mitte",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#e75b71",
          "width": 43,
          "height": 72,
          "depth": 2,
          "bendMain": 100,
          "bendCross": 45,
          "orientation": "toward-parent",
          "rotationBase": 85,
          "rotationSpread": 5,
          "start": {
            "x": 0.5,
            "y": 0.88
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": 80,
            "max": 90
          }
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 6,
            "max": 8
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 93,
            "max": 94
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        }
      },
      {
        "id": "petal-copy-copy",
        "name": "Rosenblätter Innen",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#e75b71",
          "width": 43,
          "height": 60,
          "depth": 2,
          "bendMain": 78,
          "bendCross": 55,
          "orientation": "toward-parent",
          "rotationBase": 89,
          "rotationSpread": 3,
          "start": {
            "x": 0.5,
            "y": 0.88
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": 86,
            "max": 92
          }
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 5,
            "max": 7
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 63,
            "max": 63
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "bloom": {
          "x": 500,
          "y": 900
        },
        "petal": {
          "x": 248,
          "y": 754
        },
        "petal-copy": {
          "x": 500,
          "y": 754
        },
        "petal-copy-copy": {
          "x": 752,
          "y": 754
        }
      }
    },
    "availableInBouquet": false,
    "availableAsComponent": true
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
            "childId": "loop-1"
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
            "childId": "leaf"
          },
          {
            "childId": "node-5"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 50,
            "max": 70
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25
        }
      },
      {
        "id": "leaf",
        "name": "Blatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#5b8d53",
          "width": 40,
          "height": 60,
          "depth": 2,
          "start": {
            "x": 0,
            "y": 0.5
          },
          "end": {
            "x": 1,
            "y": 0.5
          },
          "rotation": {
            "min": 75,
            "max": 105
          },
          "bendMain": -31,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 15,
          "bendCross": 17,
          "paint": []
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 2
          },
          "length": {
            "min": 6,
            "max": 14
          },
          "angle": {
            "min": 38,
            "max": 62
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        }
      },
      {
        "id": "node-5",
        "name": "Out",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 45
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25
        },
        "connections": []
      },
      {
        "id": "loop-1",
        "name": "Wiederholung 1",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 61
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25
        },
        "connections": [
          {
            "childId": "margeritenbluete-2"
          }
        ],
        "loop": {
          "repeat": {
            "min": 2,
            "max": 2
          },
          "startNodeId": "stem",
          "endNodeId": "node-5",
          "memberNodeIds": [
            "stem",
            "leaf",
            "node-5"
          ],
          "continuationOutputNodeIds": [
            "node-5"
          ]
        }
      },
      {
        "id": "margeritenbluete-2",
        "name": "Margeritenblüte",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 12,
            "max": 42
          },
          "azimuth": {
            "min": 0,
            "max": 360
          }
        },
        "connections": [],
        "component": {
          "schemaVersion": 1,
          "id": "margeritenbluete-2",
          "name": "Margeritenblüte",
          "rootNodeId": "flower-head",
          "outputNodeIds": [
            "petal"
          ],
          "createdAt": "catalog",
          "sourceDefinitionId": "margeritenbluete-2",
          "nodes": [
            {
              "id": "flower-head",
              "name": "Basis",
              "draggable": true,
              "graphic": null,
              "connections": [
                {
                  "childId": "flower-head-copy"
                }
              ],
              "incoming": {
                "repeat": {
                  "min": 2,
                  "max": 2
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
            },
            {
              "id": "petal",
              "name": "Blütenblatt",
              "draggable": false,
              "graphic": {
                "primitive": "leaf-pointed",
                "color": "#fffdf7",
                "width": 30,
                "height": 62,
                "depth": 3.5999999999999996,
                "orientation": "toward-parent",
                "rotationBase": 90,
                "rotationSpread": 0,
                "start": {
                  "x": 0.5,
                  "y": 0.91
                },
                "end": {
                  "x": 0.5,
                  "y": 0.05
                },
                "rotation": {
                  "min": 90,
                  "max": 90
                },
                "bendMain": 21,
                "bendCross": 18
              },
              "connections": [],
              "incoming": {
                "repeat": {
                  "min": 7,
                  "max": 10
                },
                "length": {
                  "min": 0,
                  "max": 1
                },
                "angle": {
                  "min": 75,
                  "max": 76
                },
                "azimuth": {
                  "min": 0,
                  "max": 360
                },
                "randomness": 0
              }
            },
            {
              "id": "flower-head-copy",
              "name": "Blütenkopf",
              "draggable": true,
              "graphic": {
                "primitive": "sphere",
                "color": "#e4b43f",
                "width": 20,
                "height": 10,
                "depth": 20,
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
                },
                "offset": {
                  "x": 0,
                  "y": 8,
                  "z": 0
                },
                "orientation": "connection"
              },
              "connections": [
                {
                  "childId": "petal"
                }
              ],
              "incoming": {
                "repeat": {
                  "min": 1,
                  "max": 1
                },
                "length": {
                  "min": 0,
                  "max": 51
                },
                "angle": {
                  "min": 12,
                  "max": 42
                },
                "azimuth": {
                  "min": 0,
                  "max": 360
                },
                "stem": {
                  "color": "#477348",
                  "width": 1,
                  "bend": 0
                }
              }
            }
          ],
          "editor": {
            "nodePositions": {
              "flower-head": {
                "x": 0,
                "y": 0
              },
              "petal": {
                "x": -83.24873397560339,
                "y": -354.5747940041516
              },
              "flower-head-copy": {
                "x": 4.226565139034051,
                "y": -188.43485089713784
              }
            }
          }
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "loop-1": {
          "x": 661.9964820034255,
          "y": 523.0302005764768
        },
        "base": {
          "x": 653.0587156483759,
          "y": 927.2694443112766
        },
        "stem": {
          "x": 744.7984159481828,
          "y": 673.6795095663807
        },
        "margeritenbluete-2": {
          "x": 650.7083998207861,
          "y": 107.6587325533232
        },
        "leaf": {
          "x": 563.0779150515084,
          "y": 401.2189308805424
        },
        "node-5": {
          "x": 760.9150489553426,
          "y": 372.3808915865728
        }
      }
    },
    "availableInBouquet": true,
    "availableAsComponent": true
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
            "childId": "growth-loop"
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
            "max": 7
          },
          "startNodeId": "stem",
          "endNodeId": "stem",
          "memberNodeIds": [
            "stem",
            "leaf"
          ],
          "continuationOutputNodeIds": [
            "stem"
          ]
        },
        "connections": [
          {
            "childId": "umbel"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 65
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
      },
      {
        "id": "stem",
        "name": "Hauptstängel",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "leaf"
          }
        ]
      },
      {
        "id": "leaf",
        "name": "Blatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-serrated",
          "color": "#477b55",
          "width": 50,
          "height": 70,
          "depth": 1,
          "start": {
            "x": 0,
            "y": 0.5
          },
          "end": {
            "x": 1,
            "y": 0.5
          },
          "rotation": {
            "min": 71,
            "max": 109
          },
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 19,
          "bendMain": -17,
          "bendCross": 38
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 0,
            "max": 2
          },
          "length": {
            "min": 0,
            "max": 18
          },
          "angle": {
            "min": 34,
            "max": 46
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.52
        }
      },
      {
        "id": "umbel",
        "name": "Doldenast",
        "draggable": true,
        "graphic": null,
        "connections": [
          {
            "childId": "loop-1"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 4,
            "max": 6
          },
          "length": {
            "min": 18,
            "max": 21
          },
          "angle": {
            "min": 38,
            "max": 42
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.11
        }
      },
      {
        "id": "sprig",
        "name": "Blütenzweig",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "floret-copy"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 0,
            "max": 0
          },
          "length": {
            "min": 25,
            "max": 88
          },
          "angle": {
            "min": 31,
            "max": 31
          },
          "azimuth": {
            "min": 0,
            "max": 258
          },
          "randomness": 0.17
        }
      },
      {
        "id": "floret",
        "name": "Einzelblüte Spitze",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#a778c4",
          "width": 7,
          "height": 7,
          "depth": 7,
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
        "connections": [],
        "incoming": {
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
      },
      {
        "id": "loop-1",
        "name": "Wiederholung 1",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 3
          },
          "length": {
            "min": 18,
            "max": 34
          },
          "angle": {
            "min": 0,
            "max": 0
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        },
        "connections": [
          {
            "childId": "floret"
          }
        ],
        "loop": {
          "repeat": {
            "min": 2,
            "max": 4
          },
          "startNodeId": "sprig",
          "endNodeId": "sprig",
          "memberNodeIds": [
            "sprig",
            "floret-copy"
          ],
          "continuationOutputNodeIds": [
            "sprig"
          ]
        }
      },
      {
        "id": "floret-copy",
        "name": "Einzelblüte",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#a778c4",
          "width": 7,
          "height": 7,
          "depth": 7,
          "start": {
            "x": 0.5,
            "y": 0.5
          },
          "end": {
            "x": 0.5,
            "y": 0
          },
          "rotation": {
            "min": -22,
            "max": 6
          },
          "orientation": "toward-parent",
          "rotationBase": -8,
          "rotationSpread": 14
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 3,
            "max": 6
          },
          "length": {
            "min": 9,
            "max": 28
          },
          "angle": {
            "min": 34,
            "max": 51
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 900
        },
        "growth-loop": {
          "x": 445.32071550687147,
          "y": 803.1272340676721
        },
        "stem": {
          "x": 193.32071550687147,
          "y": 657.1272340676721
        },
        "leaf": {
          "x": 193.32071550687147,
          "y": 511.12723406767213
        },
        "umbel": {
          "x": 225.62236312566654,
          "y": 246.43980746085833
        },
        "loop-1": {
          "x": 699.9965435984807,
          "y": 674.8822270326125
        },
        "sprig": {
          "x": 573.9965435984807,
          "y": 528.8822270326125
        },
        "floret-copy": {
          "x": 573.9965435984807,
          "y": 382.8822270326125
        },
        "floret": {
          "x": 560.0757114291191,
          "y": 109.62460524302253
        }
      }
    },
    "availableInBouquet": true,
    "availableAsComponent": true
  },
  {
    "schemaVersion": 2,
    "id": "neue-blume",
    "name": "Schleierkraut",
    "rootNodeId": "base",
    "stem": {
      "color": "#426f50",
      "highlightColor": "#82a878",
      "width": 8,
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
            "childId": "node-2"
          }
        ]
      },
      {
        "id": "node-2",
        "name": "Ast",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 14,
            "max": 70
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#426f50",
            "width": 5,
            "bend": 0,
            "curve": 14
          }
        },
        "connections": [
          {
            "childId": "loop-2"
          }
        ]
      },
      {
        "id": "node-3",
        "name": "Ast",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 0,
            "max": 9
          },
          "length": {
            "min": 50,
            "max": 70
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.25,
          "stem": {
            "color": "#426f50",
            "width": 5.5,
            "bend": 0,
            "curve": 14
          }
        },
        "connections": [
          {
            "childId": "node-3-copy-2"
          },
          {
            "childId": "node-3-copy-copy"
          }
        ]
      },
      {
        "id": "loop-2",
        "name": "Verzweigter Ast",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 2,
            "max": 3
          },
          "length": {
            "min": 0,
            "max": 24
          },
          "angle": {
            "min": 4,
            "max": 119
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 1,
          "stem": {
            "color": "#426f50",
            "width": 1.5
          }
        },
        "connections": [],
        "loop": {
          "repeat": {
            "min": 2,
            "max": 2
          },
          "startNodeId": "node-3",
          "endNodeId": "node-3-copy-2",
          "memberNodeIds": [
            "node-3",
            "node-3-copy-2",
            "node-3-copy-copy",
            "node-3-copy"
          ],
          "continuationOutputNodeIds": [
            "node-3-copy-2"
          ]
        }
      },
      {
        "id": "node-3-copy",
        "name": "Blüte",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#ffffff",
          "width": 4,
          "height": 4,
          "depth": 5,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "orientation": "connection",
          "rotationBase": -180,
          "rotationSpread": 0,
          "rotation": {
            "min": -180,
            "max": -180
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          }
        },
        "incoming": {
          "repeat": {
            "min": 2,
            "max": 3
          },
          "length": {
            "min": 10,
            "max": 43
          },
          "angle": {
            "min": 0,
            "max": 55
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0,
          "stem": {
            "color": "#426f50",
            "width": 1
          }
        },
        "connections": []
      },
      {
        "id": "node-3-copy-2",
        "name": "Ast Kopie",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 2,
            "max": 3
          },
          "length": {
            "min": 51,
            "max": 80
          },
          "angle": {
            "min": 30,
            "max": 56
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0,
          "stem": {
            "color": "#426f50",
            "width": 1
          }
        },
        "connections": [
          {
            "childId": "node-3-copy"
          }
        ]
      },
      {
        "id": "node-3-copy-copy",
        "name": "Blüte Kopie",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#ffffff",
          "width": 5,
          "height": 7,
          "depth": 5,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          }
        },
        "incoming": {
          "repeat": {
            "min": 2,
            "max": 3
          },
          "length": {
            "min": 8,
            "max": 36
          },
          "angle": {
            "min": 0,
            "max": 55
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.38,
          "stem": {
            "color": "#426f50",
            "width": 1
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "loop-2": {
          "x": 500,
          "y": 316
        },
        "base": {
          "x": 500,
          "y": 900
        },
        "node-2": {
          "x": 500,
          "y": 754
        },
        "node-3": {
          "x": 500,
          "y": 462
        },
        "node-3-copy": {
          "x": 374,
          "y": 170
        },
        "node-3-copy-2": {
          "x": 374,
          "y": 316
        },
        "node-3-copy-copy": {
          "x": 626,
          "y": 316
        }
      }
    },
    "availableInBouquet": true,
    "availableAsComponent": true
  },
  {
    "schemaVersion": 2,
    "id": "margeritenbluete-2",
    "name": "Margeritenblüte",
    "catalogRole": "component",
    "rootNodeId": "flower-head",
    "stem": {
      "color": "#477348",
      "highlightColor": "#76a56e",
      "width": 10,
      "taper": 0.72
    },
    "nodes": [
      {
        "id": "flower-head",
        "name": "Basis",
        "draggable": true,
        "graphic": null,
        "connections": [
          {
            "childId": "flower-head-copy"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 2,
            "max": 2
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
      },
      {
        "id": "petal",
        "name": "Blütenblatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#fffdf7",
          "width": 30,
          "height": 62,
          "depth": 1.5,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "start": {
            "x": 0.5,
            "y": 0.91
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": 90,
            "max": 90
          },
          "bendMain": 21,
          "bendCross": 18
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 7,
            "max": 10
          },
          "length": {
            "min": 0,
            "max": 1
          },
          "angle": {
            "min": 75,
            "max": 76
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
        }
      },
      {
        "id": "flower-head-copy",
        "name": "Blütenkopf",
        "draggable": true,
        "graphic": {
          "primitive": "sphere",
          "color": "#e4b43f",
          "width": 20,
          "height": 10,
          "depth": 20,
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
          },
          "offset": {
            "x": 0,
            "y": 8,
            "z": 0
          },
          "orientation": "connection"
        },
        "connections": [
          {
            "childId": "petal"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 51
          },
          "angle": {
            "min": 12,
            "max": 42
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "stem": {
            "color": "#477348",
            "width": 1,
            "bend": 0
          }
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "flower-head": {
          "x": 500,
          "y": 900
        },
        "petal": {
          "x": 500,
          "y": 608
        },
        "flower-head-copy": {
          "x": 500,
          "y": 754
        }
      }
    },
    "availableInBouquet": false,
    "availableAsComponent": true
  },
  {
    "schemaVersion": 2,
    "id": "neue-blume-2",
    "name": "Lilienblüte",
    "catalogRole": "flower",
    "availableInBouquet": true,
    "availableAsComponent": true,
    "rootNodeId": "base",
    "stem": {
      "color": "#426f50",
      "highlightColor": "#82a878",
      "width": 8,
      "taper": 0.72,
      "bend": 0,
      "curve": 14
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "node-2-copy-copy"
          },
          {
            "childId": "node-2"
          },
          {
            "childId": "node-4"
          }
        ]
      },
      {
        "id": "node-2",
        "name": "Blütenblatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#fbd513",
          "width": 50,
          "height": 80,
          "depth": 1,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "orientation": "toward-parent",
          "rotationBase": -90,
          "rotationSpread": 0,
          "rotation": {
            "min": -90,
            "max": -90
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          },
          "bendMain": 81,
          "bendCross": -29
        },
        "incoming": {
          "repeat": {
            "min": 5,
            "max": 5
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 31,
            "max": 31
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0,
          "stem": {
            "color": "#426f50",
            "width": 8,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 32,
              "max": 32
            }
          },
          "roll": {
            "min": 0,
            "max": 0
          }
        },
        "connections": []
      },
      {
        "id": "node-2-copy-copy",
        "name": "Fadenknoten",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#8d535f",
          "width": 3,
          "height": 3,
          "depth": 3,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "orientation": "toward-parent",
          "rotationBase": -84,
          "rotationSpread": 0,
          "rotation": {
            "min": -84,
            "max": -84
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          }
        },
        "incoming": {
          "repeat": {
            "min": 9,
            "max": 11
          },
          "length": {
            "min": 17,
            "max": 43
          },
          "angle": {
            "min": 16,
            "max": 19
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 1,
          "stem": {
            "color": "#dd8455",
            "width": 1,
            "bend": -100,
            "curve": 76,
            "bendRotation": {
              "min": 180,
              "max": 180
            }
          },
          "roll": {
            "min": -180,
            "max": -180
          }
        },
        "connections": []
      },
      {
        "id": "node-4",
        "name": "Knoten 4",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#926363",
          "width": 10,
          "height": 5,
          "depth": 10,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 6,
            "z": 0
          },
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          }
        },
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 0,
            "max": 10
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "roll": {
            "min": 0,
            "max": 0
          },
          "randomness": 0.25
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 247
        },
        "node-2-copy-copy": {
          "x": 248,
          "y": 99
        },
        "node-2": {
          "x": 500,
          "y": 99
        },
        "node-4": {
          "x": 752,
          "y": 99
        }
      }
    },
    "outputNodeIds": []
  },
  {
    "schemaVersion": 2,
    "id": "neue-blume-3",
    "name": "Rosenblüte",
    "catalogRole": "flower",
    "availableInBouquet": true,
    "availableAsComponent": true,
    "rootNodeId": "base",
    "stem": {
      "color": "#426f50",
      "highlightColor": "#82a878",
      "width": 8,
      "taper": 1,
      "bend": 0,
      "curve": 14
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 840
        }
      }
    }
  }
];
