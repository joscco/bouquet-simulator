import type {FlowerDefinition} from '../models/flower.models';

// Wird über den lokalen Blumen-Editor erzeugt. Änderungen bitte im Editor speichern.
export const DEFAULT_FLOWERS: FlowerDefinition[] = [
  {
    "schemaVersion": 2,
    "id": "peony",
    "name": "Pfingstrose",
    "rootNodeId": "node-3",
    "stem": {
      "color": "#477348",
      "highlightColor": "#76a56e",
      "width": 10,
      "taper": 0.72
    },
    "nodes": [
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
            "min": 16,
            "max": 16
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
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
          "id": "peony-blossom",
          "name": "Pfingstrosenblüte",
          "sourceDefinitionId": "peony-blossom"
        }
      },
      {
        "id": "dornenstaengel",
        "name": "Dornenstängel",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 24,
            "max": 24
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "pfingstrosenbluete"
          }
        ],
        "component": {
          "schemaVersion": 1,
          "id": "dornenstaengel",
          "name": "Dornenstängel",
          "sourceDefinitionId": "dornenstaengel"
        }
      },
      {
        "id": "node-3",
        "name": "Basis",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 10,
            "startWidth": 10,
            "endWidth": 7.199999999999999,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "dornenstaengel"
          }
        ]
      }
    ],
    "editor": {
      "nodePositions": {
        "pfingstrosenbluete": {
          "x": 500,
          "y": 104
        },
        "dornenstaengel": {
          "x": 500,
          "y": 262
        },
        "node-3": {
          "x": 500,
          "y": 415
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
    "id": "peony-blossom",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 5
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 10,
            "startWidth": 10,
            "endWidth": 7.199999999999999,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      },
      {
        "id": "petal",
        "name": "Rosenblätter",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#e75b71",
          "width": 43,
          "height": 72,
          "depth": 2,
          "bendMain": 93,
          "bendCross": 23.4,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "start": {
            "x": 0.5,
            "y": 0.88
          },
          "end": {
            "x": 0.5,
            "y": 0.05
          },
          "rotation": {
            "min": 90,
            "max": 90
          },
          "leafEdge": {
            "serrationCount": 5,
            "serrationDepth": 4.2,
            "serrationSharpness": 0,
            "edgeCurvature": -0.2
          },
          "twist": 0
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 26,
            "max": 26
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 80.5,
              "max": 117
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0.7,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "bloom": {
          "x": 500,
          "y": 247
        },
        "petal": {
          "x": 500,
          "y": 99
        }
      }
    },
    "availableInBouquet": false,
    "availableAsComponent": true
  },
  {
    "schemaVersion": 2,
    "id": "daisy",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50835a",
            "width": 5,
            "startWidth": 5,
            "endWidth": 5,
            "bend": 0,
            "curve": 0,
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
          "paint": [],
          "patterns": [
            {
              "id": "veins",
              "type": "veins",
              "color": "#315c3a",
              "opacity": 0.65,
              "density": 5,
              "size": 0.012
            }
          ]
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 38,
              "max": 62
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50835a",
            "width": 5,
            "startWidth": 5,
            "endWidth": 2,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50835a",
            "width": 5,
            "startWidth": 5,
            "endWidth": 5,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50835a",
            "width": 7,
            "startWidth": 7,
            "endWidth": 4.760000000000001,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 18,
              "max": 18
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50835a",
            "width": 5,
            "startWidth": 5,
            "endWidth": 5,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [],
        "component": {
          "schemaVersion": 1,
          "id": "daisy-blossom",
          "name": "Margeritenblüte",
          "rootNodeId": "flower-head",
          "outputNodeIds": [
            "petal"
          ],
          "createdAt": "catalog",
          "sourceDefinitionId": "daisy-blossom",
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
          "x": 500,
          "y": 391
        },
        "base": {
          "x": 500,
          "y": 673
        },
        "stem": {
          "x": 500,
          "y": 457
        },
        "margeritenbluete-2": {
          "x": 500,
          "y": 104
        },
        "leaf": {
          "x": 374,
          "y": 325
        },
        "node-5": {
          "x": 626,
          "y": 325
        }
      }
    },
    "availableInBouquet": true,
    "availableAsComponent": true,
    "outputNodeIds": []
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 6
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 34,
              "max": 46
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.52,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 38,
              "max": 42
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.11,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 31,
              "max": 31
            },
            "revolution": {
              "min": 0,
              "max": 258
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.17,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 25,
              "max": 75
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 34,
              "max": 51
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5.58,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 1227
        },
        "growth-loop": {
          "x": 500,
          "y": 945
        },
        "umbel": {
          "x": 500,
          "y": 663
        },
        "loop-1": {
          "x": 500,
          "y": 381
        },
        "floret": {
          "x": 500,
          "y": 99
        },
        "leaf": {
          "x": 500,
          "y": 879
        },
        "stem": {
          "x": 500,
          "y": 1011
        },
        "floret-copy": {
          "x": 500,
          "y": 315
        },
        "sprig": {
          "x": 500,
          "y": 447
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
            "childId": "node-3-copy-3"
          }
        ]
      },
      {
        "id": "node-8",
        "name": "Out",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 0,
            "max": 0
          },
          "length": {
            "min": 5,
            "max": 5
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -2,
              "max": -2
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#6dca8b",
            "width": 1,
            "startWidth": 1,
            "endWidth": 1,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "node-8-copy"
          }
        ]
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
            "min": 3,
            "max": 25
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 52,
              "max": 52
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 1,
            "startWidth": 1,
            "endWidth": 1,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "neue-blume-8-copy"
          }
        ],
        "loop": {
          "repeat": {
            "min": 3,
            "max": 3
          },
          "startNodeId": "node-8",
          "endNodeId": "node-7-copy",
          "memberNodeIds": [
            "node-8",
            "node-8-copy",
            "node-7-copy"
          ],
          "continuationOutputNodeIds": [
            "node-7-copy"
          ]
        }
      },
      {
        "id": "node-3-copy-3",
        "name": "Start",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 35,
            "max": 35
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": 0,
              "max": 0
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#6dca8a",
            "width": 1,
            "startWidth": 1,
            "endWidth": 1,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "loop-1"
          }
        ]
      },
      {
        "id": "node-8-copy",
        "name": "Out Kopie",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 3
          },
          "length": {
            "min": 0,
            "max": 45
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": -1
          },
          "spread": {
            "deviation": {
              "min": 24,
              "max": 24
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#6dca8b",
            "width": 1,
            "startWidth": 1,
            "endWidth": 1,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "node-7-copy"
          }
        ]
      },
      {
        "id": "node-7-copy",
        "name": "Out",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 3
          },
          "length": {
            "min": 0,
            "max": 35
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 34,
              "max": 34
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#6dca8b",
            "width": 1,
            "startWidth": 1,
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
        "id": "neue-blume-8-copy",
        "name": "Schleierblüte Kopie",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#6dca8b",
            "width": 1,
            "startWidth": 1,
            "endWidth": 1,
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
          "id": "neue-blume-8",
          "name": "Schleierblüte",
          "sourceDefinitionId": "neue-blume-8"
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "loop-1": {
          "x": 415.30904556176887,
          "y": 369.8785219252497
        },
        "base": {
          "x": 406.1788335020244,
          "y": 978.2245698380568
        },
        "node-8": {
          "x": 438.392664950019,
          "y": 526.3020170036261
        },
        "neue-blume-8-copy": {
          "x": 447.5845355537083,
          "y": -37.78357958839092
        },
        "node-3-copy-3": {
          "x": 394.8941110015399,
          "y": 839.8378017098313
        },
        "node-8-copy": {
          "x": 431.2637689669797,
          "y": 367.5379516897077
        },
        "node-7-copy": {
          "x": 392.2254261735187,
          "y": 213.45502684687324
        }
      }
    },
    "availableInBouquet": true,
    "availableAsComponent": true,
    "outputNodeIds": []
  },
  {
    "schemaVersion": 2,
    "id": "daisy-blossom",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 12,
              "max": 42
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 10,
            "startWidth": 10,
            "endWidth": 7.199999999999999,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
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
          "bendCross": 18,
          "bendMainProfile": {
            "base": 16,
            "tip": -65
          },
          "bendCrossProfile": {
            "base": -2,
            "tip": 18
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 75,
              "max": 76
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 10,
            "startWidth": 10,
            "endWidth": 7.199999999999999,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      },
      {
        "id": "flower-head-copy",
        "name": "Blütenkopf",
        "draggable": true,
        "graphic": null,
        "connections": [
          {
            "childId": "petal"
          },
          {
            "childId": "node-4"
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 12,
              "max": 42
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 5,
            "startWidth": 5,
            "endWidth": 5,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      },
      {
        "id": "node-4",
        "name": "Bubbles",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#ffea00",
          "width": 5,
          "height": 5,
          "depth": 5,
          "twist": 0,
          "ribCount": 0,
          "ribDepth": 0,
          "leafEdge": {
            "serrationCount": 7,
            "serrationDepth": 0,
            "serrationSharpness": 70,
            "edgeCurvature": 0
          },
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
            "min": 32,
            "max": 32
          },
          "length": {
            "min": 62.5,
            "max": 62.5
          },
          "originOffset": {
            "x": 0,
            "y": -56.2,
            "z": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 13.4
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 0,
            "startWidth": 0,
            "endWidth": 0,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
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
        "node-4": {
          "x": 680.066113575007,
          "y": 582.441522271382
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
    "availableInBouquet": false,
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
          "bendMain": 0,
          "bendCross": -50,
          "patterns": [
            {
              "id": "gradient",
              "type": "gradient",
              "color": "#ff1f1f",
              "opacity": 0.83,
              "direction": "base-to-tip"
            },
            {
              "id": "spots",
              "type": "spots",
              "color": "#c81e1e",
              "opacity": 0.71,
              "density": 30,
              "size": 0.05,
              "seed": 0.1
            }
          ],
          "bendMainProfile": {
            "base": -62,
            "tip": 231
          },
          "bendCrossProfile": {
            "base": -56,
            "tip": -39
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 68,
              "max": 68
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 8,
            "startWidth": 8,
            "endWidth": 5.76,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 32,
              "max": 32
            }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 16,
              "max": 19
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": -180,
              "max": -180
            },
            "randomness": 1,
            "orientation": "spread"
          },
          "stem": {
            "color": "#dd8455",
            "width": 1,
            "startWidth": 1,
            "endWidth": 0.72,
            "bend": -100,
            "curve": 76,
            "bendRotation": {
              "min": 180,
              "max": 180
            }
          }
        },
        "connections": []
      },
      {
        "id": "node-4",
        "name": "Doldenmitte",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#ff7300",
          "width": 15,
          "height": 6,
          "depth": 15,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 8,
            "startWidth": 8,
            "endWidth": 5.76,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
        "node-2": {
          "x": 506.0967662626881,
          "y": 113.49774426780323
        },
        "node-2-copy-copy": {
          "x": 248,
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
    "id": "neue-blume-4",
    "name": "Lilly",
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
        "connections": [
          {
            "childId": "neue-blume-2"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 96,
            "max": 106
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 6.5,
            "startWidth": 6.5,
            "endWidth": 8,
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
        "id": "neue-blume-2",
        "name": "Lilienblüte",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 149,
            "max": 149
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": 174,
              "max": 174
            },
            "roll": {
              "min": -76,
              "max": -76
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 6,
            "startWidth": 6,
            "endWidth": 6,
            "bend": 0,
            "curve": 28,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [],
        "component": {
          "schemaVersion": 1,
          "id": "neue-blume-2",
          "name": "Lilienblüte",
          "sourceDefinitionId": "neue-blume-2"
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 840
        },
        "neue-blume-2": {
          "x": 498.2313538519638,
          "y": 461.2436555891238
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "dornenstaengel",
    "name": "Dornenstängel",
    "catalogRole": "component",
    "availableInBouquet": false,
    "availableAsComponent": true,
    "outputNodeIds": [
      "node-10"
    ],
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
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
          "primitive": "leaf-serrated",
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
          "rotationSpread": 7,
          "patterns": [
            {
              "id": "veins",
              "type": "veins",
              "color": "#315c3a",
              "opacity": 0.87,
              "density": 6,
              "size": 0.012,
              "angle": -24
            }
          ],
          "leafEdge": {
            "serrationCount": 7,
            "serrationDepth": 8,
            "serrationSharpness": 70,
            "edgeCurvature": -30
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 58,
              "max": 74
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.27,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 6.5,
            "startWidth": 6.5,
            "endWidth": 4.68,
            "bend": 0,
            "curve": 22,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "node-10"
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
        "name": "Out Blatt",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 56,
              "max": 56
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 1,
            "orientation": "spread"
          },
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
        "name": "Out Dorn",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 10,
            "startWidth": 10,
            "endWidth": 7.199999999999999,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
      },
      {
        "id": "node-10",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": 0,
              "max": 0
            },
            "roll": {
              "min": -180,
              "max": -180
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "loop-1": {
          "x": 515.7559686542637,
          "y": 429.2421087592029
        },
        "loop-2": {
          "x": 515.7559686542637,
          "y": 561.2421087592029
        },
        "base": {
          "x": 530.4416068731118,
          "y": 907.2087424471299
        },
        "stem": {
          "x": 515.0618837952973,
          "y": 295.24210875920306
        },
        "node-7": {
          "x": 515.0618837952973,
          "y": 627.2421087592028
        },
        "leaf": {
          "x": 389.06188379529726,
          "y": 163.24210875920306
        },
        "node-6": {
          "x": 676.8524622057521,
          "y": 146.5339728372523
        },
        "node-7-copy": {
          "x": 389.06188379529726,
          "y": 495.242108759203
        },
        "node-9": {
          "x": 642.4500535132302,
          "y": 496.6302784771359
        },
        "node-10": {
          "x": 521.1273309189376,
          "y": -54.02839982741125
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "neue-blume-5",
    "name": "Kirschblüte",
    "catalogRole": "flower",
    "availableInBouquet": false,
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
        "connections": [
          {
            "childId": "node-2"
          },
          {
            "childId": "node-3"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 50,
            "max": 84
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 2,
            "startWidth": 2,
            "endWidth": 2,
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
        "id": "node-2",
        "name": "Blatt",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#ffffff",
          "width": 20,
          "height": 30,
          "depth": 1,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "orientation": "toward-parent",
          "rotationBase": 91,
          "rotationSpread": 0,
          "rotation": {
            "min": 91,
            "max": 91
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          },
          "bendMain": -1,
          "bendMainProfile": {
            "base": -10,
            "tip": -1
          },
          "bendCross": 24,
          "bendCrossProfile": {
            "base": 20,
            "tip": 24
          },
          "patterns": [
            {
              "id": "gradient",
              "type": "gradient",
              "color": "#ff8abd",
              "opacity": 0.85,
              "direction": "tip-to-base"
            }
          ]
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 64,
              "max": 64
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 2,
            "startWidth": 2,
            "endWidth": 2,
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
        "id": "node-3",
        "name": "Innenstängel",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#ffe5fa",
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
            "min": 4,
            "max": 6
          },
          "length": {
            "min": 13,
            "max": 13
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 17,
              "max": 17
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 1,
              "max": 1
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#ff8ae9",
            "width": 2,
            "startWidth": 2,
            "endWidth": 1,
            "bend": -56,
            "curve": 0,
            "bendRotation": {
              "min": -1,
              "max": -1
            }
          }
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
        "node-2": {
          "x": 374,
          "y": 99
        },
        "node-3": {
          "x": 626,
          "y": 99
        }
      }
    },
    "outputNodeIds": [
      "base"
    ]
  },
  {
    "schemaVersion": 2,
    "id": "neue-blume-3",
    "name": "Kirschblütenzweig",
    "catalogRole": "flower",
    "availableInBouquet": true,
    "availableAsComponent": false,
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
  },
  {
    "schemaVersion": 2,
    "id": "sunflower",
    "name": "Sonnenblume",
    "rootNodeId": "node-6",
    "availableInBouquet": true,
    "availableAsComponent": true,
    "catalogIcon": {
      "symbol": "☀",
      "color": "#d59b18"
    },
    "outputNodeIds": [],
    "stem": {
      "color": "#50754a",
      "highlightColor": "#83a86b",
      "width": 9,
      "taper": 0.68,
      "bend": 0,
      "curve": 24
    },
    "nodes": [
      {
        "id": "base",
        "name": "Stamm",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "leaf"
          },
          {
            "childId": "node-7"
          }
        ],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 7,
            "max": 7
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 8,
            "startWidth": 8,
            "endWidth": 8,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        }
      },
      {
        "id": "leaf",
        "name": "Stängelblätter",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-serrated",
          "color": "#4d7b42",
          "width": 62,
          "height": 78,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": -109,
          "rotationSpread": 0,
          "rotation": {
            "min": -109,
            "max": -109
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "bendMain": 21,
          "bendCross": -10,
          "leafEdge": {
            "serrationCount": 4,
            "serrationDepth": 11,
            "serrationSharpness": 100,
            "edgeCurvature": -83
          },
          "patterns": [
            {
              "id": "leaf-veins",
              "type": "veins",
              "color": "#315b35",
              "opacity": 0.5,
              "density": 7,
              "size": 0.025,
              "angle": 28
            }
          ]
        },
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 2
          },
          "length": {
            "min": 16,
            "max": 16
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 52,
              "max": 52
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.85,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 8,
            "startWidth": 8,
            "endWidth": 4,
            "bend": 4,
            "curve": 24,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": []
      },
      {
        "id": "node-6",
        "name": "Basis",
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 9,
            "startWidth": 9,
            "endWidth": 6.12,
            "bend": 0,
            "curve": 24,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "loop-1"
          }
        ]
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
            "min": 250,
            "max": 250
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 10
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 9,
            "startWidth": 9,
            "endWidth": 6.12,
            "bend": 0,
            "curve": 24,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": [
          {
            "childId": "sonnenblumenbluete"
          }
        ],
        "loop": {
          "repeat": {
            "min": 2,
            "max": 4
          },
          "startNodeId": "base",
          "endNodeId": "leaf",
          "memberNodeIds": [
            "base",
            "leaf",
            "node-7"
          ],
          "continuationOutputNodeIds": [
            "node-7"
          ]
        }
      },
      {
        "id": "node-7",
        "name": "Out",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 97,
            "max": 97
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.25,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 8,
            "startWidth": 8,
            "endWidth": 8,
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
        "id": "sonnenblumenbluete",
        "name": "Sonnenblumenblüte",
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
          "direction": {
            "x": -180,
            "y": 0,
            "z": 108
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 0
            },
            "revolution": {
              "min": 0,
              "max": 0
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5,
            "bend": 8,
            "curve": 38,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": [],
        "component": {
          "schemaVersion": 1,
          "id": "sonnenblumenbluete",
          "name": "Sonnenblumenblüte",
          "sourceDefinitionId": "sonnenblumenbluete"
        }
      }
    ],
    "editor": {
      "nodePositions": {
        "loop-1": {
          "x": 376.0789471825227,
          "y": 395.7506355923533
        },
        "base": {
          "x": 376.0789471825227,
          "y": 461.7506355923533
        },
        "sonnenblumenbluete": {
          "x": 378.28735491231294,
          "y": 56.823002374274324
        },
        "leaf": {
          "x": 250.0789471825227,
          "y": 329.7506355923533
        },
        "node-7": {
          "x": 502.0789471825227,
          "y": 329.7506355923533
        },
        "node-6": {
          "x": 375.28562508671484,
          "y": 684.3363646884629
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "tulip",
    "name": "Tulpe",
    "rootNodeId": "base",
    "availableInBouquet": true,
    "availableAsComponent": true,
    "catalogIcon": {
      "symbol": "♢",
      "color": "#cf416b"
    },
    "outputNodeIds": [],
    "stem": {
      "color": "#467744",
      "highlightColor": "#80a86c",
      "width": 7,
      "taper": 0.62,
      "bend": 0,
      "curve": 28
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "bloom"
          },
          {
            "childId": "leaf"
          }
        ]
      },
      {
        "id": "bloom",
        "name": "Blütenansatz",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 135,
            "max": 170
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 7
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.22,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 5,
            "startWidth": 5,
            "endWidth": 4,
            "bend": 10,
            "curve": 46,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": [
          {
            "childId": "outer-petal"
          },
          {
            "childId": "inner-petal"
          },
          {
            "childId": "node-6"
          }
        ]
      },
      {
        "id": "outer-petal",
        "name": "Äußere Blütenblätter",
        "draggable": false,
        "graphic": {
          "primitive": "petal-rounded",
          "color": "#d94d78",
          "width": 38,
          "height": 68,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "rotation": {
            "min": 90,
            "max": 90
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "accentColor": "#f291ad",
          "bendMain": 77,
          "bendCross": 38,
          "patterns": [
            {
              "id": "petal-gradient",
              "type": "gradient",
              "color": "#8f244f",
              "opacity": 0.42,
              "direction": "base-to-tip"
            }
          ]
        },
        "incoming": {
          "repeat": {
            "min": 6,
            "max": 6
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 90,
              "max": 90
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.05,
            "orientation": "spread"
          },
          "stem": {
            "color": "#b93463",
            "width": 1.5,
            "startWidth": 1.5,
            "endWidth": 0.7,
            "bend": 8,
            "curve": 20,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "inner-petal",
        "name": "Innere Blütenblätter",
        "draggable": false,
        "graphic": {
          "primitive": "petal-rounded",
          "color": "#eb668b",
          "width": 30,
          "height": 60,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "rotation": {
            "min": 90,
            "max": 90
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "bendMain": 88,
          "bendCross": 42,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 1
          }
        },
        "incoming": {
          "repeat": {
            "min": 3,
            "max": 3
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 90,
              "max": 90
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#bf2b58",
            "width": 1.3,
            "startWidth": 1.3,
            "endWidth": 0.6,
            "bend": 6,
            "curve": 16,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "leaf",
        "name": "Tulpenblätter",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#4c804b",
          "width": 34,
          "height": 118,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": -6,
          "rotationSpread": 0,
          "rotation": {
            "min": -6,
            "max": -6
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "bendMain": -19,
          "bendCross": -42,
          "patterns": [
            {
              "id": "leaf-gradient",
              "type": "gradient",
              "color": "#274f31",
              "opacity": 0.34,
              "direction": "base-to-tip"
            }
          ],
          "bendMainProfile": {
            "base": 72,
            "tip": -29
          }
        },
        "incoming": {
          "repeat": {
            "min": 2,
            "max": 3
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 1,
              "max": 1
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.28,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 35,
            "curve": 50,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": []
      },
      {
        "id": "node-6",
        "name": "Staubblätter",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 6,
            "max": 6
          },
          "length": {
            "min": 35,
            "max": 35
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 9,
              "max": 9
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": -30,
              "max": -30
            },
            "randomness": 0.11,
            "orientation": "spread"
          },
          "stem": {
            "color": "#467744",
            "width": 3,
            "startWidth": 3,
            "endWidth": 1,
            "bend": -1,
            "curve": 30,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 760
        },
        "bloom": {
          "x": 500,
          "y": 560
        },
        "leaf": {
          "x": 720,
          "y": 570
        },
        "outer-petal": {
          "x": 260,
          "y": 340
        },
        "inner-petal": {
          "x": 470,
          "y": 340
        },
        "node-6": {
          "x": 658.6203966452114,
          "y": 328.67890653414514
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "lavender",
    "name": "Lavendel",
    "rootNodeId": "base",
    "availableInBouquet": true,
    "availableAsComponent": true,
    "catalogIcon": {
      "symbol": "✦",
      "color": "#7659a8"
    },
    "outputNodeIds": [],
    "stem": {
      "color": "#55714a",
      "highlightColor": "#91a879",
      "width": 5,
      "taper": 0.58,
      "bend": 0,
      "curve": 32
    },
    "nodes": [
      {
        "id": "base",
        "name": "Basis",
        "draggable": false,
        "graphic": null,
        "connections": [
          {
            "childId": "tip"
          },
          {
            "childId": "leaf"
          }
        ]
      },
      {
        "id": "tip",
        "name": "Blütenstand",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 125,
            "max": 165
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 9
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.22,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 5,
            "startWidth": 5,
            "endWidth": 2.2,
            "bend": 12,
            "curve": 58,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": [
          {
            "childId": "floret"
          },
          {
            "childId": "bud"
          }
        ]
      },
      {
        "id": "floret",
        "name": "Lavendelblüten",
        "draggable": false,
        "graphic": {
          "primitive": "cone",
          "color": "#7652a4",
          "width": 9,
          "height": 17,
          "depth": 9,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 20,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          }
        },
        "incoming": {
          "repeat": {
            "min": 18,
            "max": 24
          },
          "length": {
            "min": 6,
            "max": 36
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 180
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": -30,
              "max": 30
            },
            "randomness": 0.28,
            "orientation": "spread"
          },
          "stem": {
            "color": "#5d744e",
            "width": 1.8,
            "startWidth": 1.8,
            "endWidth": 1.1,
            "bend": 28,
            "curve": 52,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": []
      },
      {
        "id": "bud",
        "name": "Knospen",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#9c7bc0",
          "width": 7,
          "height": 11,
          "depth": 7,
          "scale": 1,
          "orientation": "connection",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          }
        },
        "incoming": {
          "repeat": {
            "min": 8,
            "max": 12
          },
          "length": {
            "min": 4,
            "max": 22
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 180
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.36,
            "orientation": "spread"
          },
          "stem": {
            "color": "#6f568a",
            "width": 1.2,
            "startWidth": 1.2,
            "endWidth": 0.55,
            "bend": 16,
            "curve": 35,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "leaf",
        "name": "Schmale Blätter",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#617c53",
          "width": 13,
          "height": 54,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 16,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "bendMain": 38,
          "bendCross": 18
        },
        "incoming": {
          "repeat": {
            "min": 4,
            "max": 7
          },
          "length": {
            "min": 38,
            "max": 92
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 23,
              "max": 54
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.31,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 2.2,
            "startWidth": 2.2,
            "endWidth": 1.2,
            "bend": 24,
            "curve": 55,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 720
        },
        "tip": {
          "x": 500,
          "y": 510
        },
        "floret": {
          "x": 300,
          "y": 300
        },
        "bud": {
          "x": 510,
          "y": 300
        },
        "leaf": {
          "x": 720,
          "y": 510
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "sonnenblumenbluete",
    "name": "Sonnenblumenblüte",
    "catalogRole": "component",
    "availableInBouquet": false,
    "availableAsComponent": true,
    "outputNodeIds": [],
    "rootNodeId": "head",
    "stem": {
      "color": "#477348",
      "highlightColor": "#76a56e",
      "width": 10,
      "taper": 0.72
    },
    "nodes": [
      {
        "id": "head",
        "name": "Blütenkopf",
        "draggable": false,
        "graphic": {
          "primitive": "disc",
          "color": "#604020",
          "width": 40,
          "height": 2,
          "depth": 40,
          "scale": 1,
          "orientation": "connection",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "offset": {
            "x": 0,
            "y": 4,
            "z": 0
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 76,
              "max": 76
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.22,
            "orientation": "spread"
          },
          "stem": {
            "color": "#50754a",
            "width": 9,
            "startWidth": 9,
            "endWidth": 5,
            "bend": 8,
            "curve": 38,
            "bendRotation": {
              "min": -25,
              "max": 25
            }
          }
        },
        "connections": [
          {
            "childId": "petal"
          },
          {
            "childId": "seed-crown-copy-2"
          },
          {
            "childId": "seed-crown-copy-2-copy-copy-copy"
          },
          {
            "childId": "seed-crown-copy-2-copy"
          },
          {
            "childId": "seed-crown-copy-2-copy-copy"
          },
          {
            "childId": "node-7"
          }
        ]
      },
      {
        "id": "petal",
        "name": "Strahlenblüten",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#e3ae22",
          "width": 15,
          "height": 43,
          "depth": 1,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "rotation": {
            "min": 90,
            "max": 90
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "bendMain": -2,
          "bendCross": -28,
          "bendMainProfile": {
            "base": 15,
            "tip": -60
          },
          "patterns": [
            {
              "id": "gradient",
              "type": "gradient",
              "color": "#ff9924",
              "opacity": 0.55,
              "direction": "base-to-tip"
            }
          ]
        },
        "incoming": {
          "repeat": {
            "min": 27,
            "max": 27
          },
          "length": {
            "min": 15,
            "max": 15
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 76,
              "max": 76
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 2,
              "max": 2
            },
            "randomness": 0.03,
            "orientation": "spread"
          },
          "stem": {
            "color": "#d5a01d",
            "width": 1.4,
            "startWidth": 1.4,
            "endWidth": 0.7,
            "bend": 16,
            "curve": 24,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "seed-crown-copy-2",
        "name": "Samenkranz 2",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#674218",
          "width": 5,
          "height": 5,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "offset": {
            "x": 0,
            "y": 6,
            "z": 0
          },
          "patterns": []
        },
        "incoming": {
          "repeat": {
            "min": 19,
            "max": 19
          },
          "length": {
            "min": 8,
            "max": 8
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 67,
              "max": 67
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 53,
              "max": 53
            },
            "randomness": 0.03,
            "orientation": "spread"
          },
          "stem": {
            "color": "#71502a",
            "width": 1.2,
            "startWidth": 1.2,
            "endWidth": 0.6,
            "bend": 0,
            "curve": 18,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "seed-crown-copy-2-copy",
        "name": "Samenkranz 3",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#674218",
          "width": 5,
          "height": 5,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "offset": {
            "x": 0,
            "y": 6,
            "z": 0
          }
        },
        "incoming": {
          "repeat": {
            "min": 26,
            "max": 26
          },
          "length": {
            "min": 11,
            "max": 11
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 71,
              "max": 71
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 62,
              "max": 62
            },
            "randomness": 0.03,
            "orientation": "spread"
          },
          "stem": {
            "color": "#71502a",
            "width": 1.2,
            "startWidth": 1.2,
            "endWidth": 0.6,
            "bend": 0,
            "curve": 18,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "seed-crown-copy-2-copy-copy",
        "name": "Samenkranz 4",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#674218",
          "width": 5,
          "height": 5,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "offset": {
            "x": 0,
            "y": 6,
            "z": 0
          }
        },
        "incoming": {
          "repeat": {
            "min": 30,
            "max": 30
          },
          "length": {
            "min": 14,
            "max": 14
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 74,
              "max": 74
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 30,
              "max": 30
            },
            "randomness": 0.03,
            "orientation": "spread"
          },
          "stem": {
            "color": "#71502a",
            "width": 1.2,
            "startWidth": 1.2,
            "endWidth": 0.6,
            "bend": 0,
            "curve": 18,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      },
      {
        "id": "seed-crown-copy-2-copy-copy-copy",
        "name": "Samenkranz 1",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#674218",
          "width": 5,
          "height": 5,
          "depth": 2,
          "scale": 1,
          "orientation": "toward-parent",
          "rotationBase": 0,
          "rotationSpread": 0,
          "rotation": {
            "min": 0,
            "max": 0
          },
          "start": {
            "x": 0.5,
            "y": 0.92
          },
          "end": {
            "x": 0.5,
            "y": 0.08
          },
          "offset": {
            "x": 0,
            "y": 6,
            "z": 0
          }
        },
        "incoming": {
          "repeat": {
            "min": 20,
            "max": 20
          },
          "length": {
            "min": 3,
            "max": 3
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 49,
              "max": 49
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 32,
              "max": 32
            },
            "randomness": 0.09,
            "orientation": "spread"
          },
          "stem": {
            "color": "#71502a",
            "width": 1.2,
            "startWidth": 1.2,
            "endWidth": 0.6,
            "bend": 0,
            "curve": 18,
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
        "name": "Unterblätter",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#35662e",
          "width": 13,
          "height": 30,
          "depth": 0.5,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 1,
            "z": -5
          },
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "rotation": {
            "min": 90,
            "max": 90
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          },
          "bendMain": 15,
          "bendMainProfile": {
            "base": 31,
            "tip": -40
          },
          "bendCross": 0
        },
        "incoming": {
          "repeat": {
            "min": 10,
            "max": 10
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 81,
              "max": 81
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#477348",
            "width": 10,
            "startWidth": 10,
            "endWidth": 7.199999999999999,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "head": {
          "x": 500,
          "y": 840
        },
        "petal": {
          "x": -130,
          "y": 692
        },
        "seed-crown-copy-2": {
          "x": 122,
          "y": 692
        },
        "seed-crown-copy-2-copy": {
          "x": 626,
          "y": 692
        },
        "seed-crown-copy-2-copy-copy": {
          "x": 878,
          "y": 692
        },
        "seed-crown-copy-2-copy-copy-copy": {
          "x": 374,
          "y": 692
        },
        "node-7": {
          "x": 1067.5767847610168,
          "y": 692.340552528798
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "neue-blume-8",
    "name": "Schleierblüte",
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
        "connections": [
          {
            "childId": "node-2"
          }
        ]
      },
      {
        "id": "node-2",
        "name": "Blüte",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#ffffff",
          "width": 5,
          "height": 3,
          "depth": 1,
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "orientation": "toward-parent",
          "rotationBase": 90,
          "rotationSpread": 0,
          "rotation": {
            "min": 90,
            "max": 90
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          },
          "bendMain": -46,
          "bendCross": -7,
          "bendMainProfile": {
            "base": -26,
            "tip": -76
          }
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
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 26
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 1,
            "startWidth": 1,
            "endWidth": 1,
            "bend": 0,
            "curve": 14,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
        },
        "connections": []
      }
    ],
    "editor": {
      "nodePositions": {
        "base": {
          "x": 500,
          "y": 840
        },
        "node-2": {
          "x": 501.8715344213764,
          "y": 684.639392195443
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "small-daisy",
    "name": "Gänseblümchenblüte",
    "catalogRole": "flower",
    "availableInBouquet": false,
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
        "connections": [
          {
            "childId": "node-2"
          },
          {
            "childId": "node-3"
          },
          {
            "childId": "node-4"
          }
        ]
      },
      {
        "id": "node-2",
        "name": "Petal",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#ebebeb",
          "width": 50,
          "height": 72.60000000000001,
          "depth": 2,
          "twist": 0,
          "ribCount": 0,
          "ribDepth": 0,
          "leafEdge": {
            "serrationCount": 7,
            "serrationDepth": 0,
            "serrationSharpness": 70,
            "edgeCurvature": 0
          },
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
          "bendMain": -23.7,
          "bendMainProfile": {
            "base": -12.5,
            "tip": 39.3
          },
          "bendCross": -18.5
        },
        "incoming": {
          "repeat": {
            "min": 9,
            "max": 9
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 50.6,
              "max": 64.6
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.039,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
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
        "id": "node-3",
        "name": "Dots",
        "draggable": false,
        "graphic": {
          "primitive": "sphere",
          "color": "#c2a042",
          "width": 8,
          "height": 8,
          "depth": 8,
          "twist": 0,
          "ribCount": 0,
          "ribDepth": 0,
          "leafEdge": {
            "serrationCount": 7,
            "serrationDepth": 0,
            "serrationSharpness": 70,
            "edgeCurvature": 0
          },
          "offset": {
            "x": 0,
            "y": 2,
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
            "min": 27,
            "max": 27
          },
          "length": {
            "min": 16.9,
            "max": 16.9
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 0,
              "max": 52.6
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 51.5,
              "max": 51.5
            },
            "randomness": 0.066,
            "orientation": "spread"
          },
          "stem": {
            "color": "#d6ed2c",
            "width": 3,
            "startWidth": 3,
            "endWidth": 2,
            "bend": 21.5,
            "curve": 0,
            "bendRotation": {
              "min": 45.7,
              "max": 45.7
            }
          }
        },
        "connections": []
      },
      {
        "id": "node-4",
        "name": "Untere Blätter",
        "draggable": false,
        "graphic": {
          "primitive": "leaf-pointed",
          "color": "#5b8d53",
          "width": 20,
          "height": 40,
          "depth": 2,
          "twist": 0,
          "ribCount": 0,
          "ribDepth": 0,
          "leafEdge": {
            "serrationCount": 7,
            "serrationDepth": 0,
            "serrationSharpness": 70,
            "edgeCurvature": 0
          },
          "offset": {
            "x": 0,
            "y": -0.9,
            "z": -2.6
          },
          "orientation": "toward-parent",
          "rotationBase": 90.1,
          "rotationSpread": 0,
          "rotation": {
            "min": 90.1,
            "max": 90.1
          },
          "start": {
            "x": 0.5,
            "y": 0.9
          },
          "end": {
            "x": 0.5,
            "y": 0.1
          },
          "bendMain": -6.1,
          "bendMainProfile": {
            "base": 4.2,
            "tip": -37.6
          }
        },
        "incoming": {
          "repeat": {
            "min": 8,
            "max": 8
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "direction": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "spread": {
            "deviation": {
              "min": 65.7,
              "max": 65.7
            },
            "revolution": {
              "min": -180,
              "max": 180
            },
            "roll": {
              "min": 0,
              "max": 0
            },
            "randomness": 0.099,
            "orientation": "spread"
          },
          "stem": {
            "color": "#426f50",
            "width": 3,
            "startWidth": 3,
            "endWidth": 3,
            "bend": 0,
            "curve": 0,
            "bendRotation": {
              "min": 0,
              "max": 0
            }
          }
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
        "node-2": {
          "x": 374,
          "y": 99
        },
        "node-3": {
          "x": 581.5932895611486,
          "y": 83.42194612955132
        },
        "node-4": {
          "x": 830,
          "y": 99
        }
      }
    },
    "outputNodeIds": []
  }
];
