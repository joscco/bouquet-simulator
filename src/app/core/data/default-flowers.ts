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
            "max": 2
          },
          "startNodeId": "stem",
          "endNodeId": "stem"
        },
        "connections": [
          {
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
            },
            "childId": "pfingstrosenbluete"
          }
        ],
        "incoming": {
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
          },
          "bendMain": -26,
          "bendCross": 11
        },
        "connections": [],
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 2
          },
          "length": {
            "min": 0,
            "max": 0
          },
          "angle": {
            "min": 48,
            "max": 74
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
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
        },
        "connections": [],
        "component": {
          "schemaVersion": 1,
          "id": "pfingstrosenbluete",
          "name": "Pfingstrosenblüte",
          "rootNodeId": "bloom",
          "outputNodeIds": [
            "petal",
            "petal-copy",
            "petal-copy-copy"
          ],
          "createdAt": "catalog",
          "sourceDefinitionId": "pfingstrosenbluete",
          "nodes": [
            {
              "id": "bloom",
              "name": "Blütenzentrum",
              "draggable": true,
              "graphic": null,
              "connections": [
                {
                  "childId": "petal",
                  "repeat": {
                    "min": 6,
                    "max": 17
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
                },
                {
                  "childId": "petal-copy",
                  "repeat": {
                    "min": 6,
                    "max": 13
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
                },
                {
                  "childId": "petal-copy-copy",
                  "repeat": {
                    "min": 6,
                    "max": 9
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
                  "min": 6,
                  "max": 17
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
                "rotationSpread": 15,
                "start": {
                  "x": 0.5,
                  "y": 0.88
                },
                "end": {
                  "x": 0.5,
                  "y": 0.05
                },
                "rotation": {
                  "min": 70,
                  "max": 100
                }
              },
              "connections": [],
              "incoming": {
                "repeat": {
                  "min": 6,
                  "max": 13
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
                "rotationSpread": 10,
                "start": {
                  "x": 0.5,
                  "y": 0.88
                },
                "end": {
                  "x": 0.5,
                  "y": 0.05
                },
                "rotation": {
                  "min": 79,
                  "max": 99
                }
              },
              "connections": [],
              "incoming": {
                "repeat": {
                  "min": 6,
                  "max": 9
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
                "x": 0,
                "y": 0
              },
              "petal": {
                "x": 166.22900989409152,
                "y": -280
              },
              "petal-copy": {
                "x": 289.90259291203404,
                "y": -166.45241049380604
              },
              "petal-copy-copy": {
                "x": 315.73619161308704,
                "y": -40.571641197571466
              }
            }
          }
        }
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
        "pfingstrosenbluete": {
          "x": 580.859375,
          "y": 311.5007560483872
        },
        "leaf": {
          "x": 251.07998885172805,
          "y": 308.58094690635454
        }
      }
    },
    "catalogRole": "flower"
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
            "max": 3
          },
          "startNodeId": "stem",
          "endNodeId": "stem"
        },
        "connections": [
          {
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
            },
            "childId": "margeritenbluete-2"
          }
        ],
        "incoming": {
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
            "min": 0,
            "max": 14
          },
          "angle": {
            "min": 40,
            "max": 45
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0
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
            "max": 2
          },
          "length": {
            "min": 0,
            "max": 65
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
                "orientation": "toward-parent"
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
            }
          ],
          "editor": {
            "nodePositions": {
              "flower-head": {
                "x": 0,
                "y": 0
              },
              "petal": {
                "x": -1.2004892287716302,
                "y": -215.0648696095716
              }
            }
          }
        }
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
        "margeritenbluete-2": {
          "x": 613.5396333509875,
          "y": 139.03789360138688
        },
        "leaf": {
          "x": 253.43516187760105,
          "y": 226.54544209624748
        }
      }
    }
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
            "min": 2,
            "max": 7
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
            },
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
            },
            "childId": "floret"
          }
        ],
        "loop": {
          "repeat": {
            "min": 2,
            "max": 4
          },
          "startNodeId": "sprig",
          "endNodeId": "sprig"
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
          "x": 684.3749670578351,
          "y": 281.0825470231448
        },
        "floret": {
          "x": 719.6297170358357,
          "y": 59
        },
        "loop-1": {
          "x": 746.7968673550564,
          "y": 273.0986476243538
        },
        "floret-copy": {
          "x": 529.4088621203317,
          "y": 81.2237242217048
        }
      }
    }
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
            "childId": "loop-1"
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
        "connections": []
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
          "randomness": 0.25
        },
        "connections": [
          {
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
            "childId": "node-3-copy-2"
          },
          {
            "repeat": {
              "min": 4,
              "max": 5
            },
            "length": {
              "min": 21,
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
            "randomness": 0.82,
            "stem": {
              "color": "#426f50",
              "width": 3.5
            },
            "childId": "node-3-copy-copy"
          }
        ]
      },
      {
        "id": "loop-1",
        "name": "Grundast",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 1,
            "max": 1
          },
          "length": {
            "min": 0,
            "max": 70
          },
          "angle": {
            "min": 3,
            "max": 37
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
            "repeat": {
              "min": 6,
              "max": 15
            },
            "length": {
              "min": 50,
              "max": 70
            },
            "angle": {
              "min": 0,
              "max": 180
            },
            "azimuth": {
              "min": 0,
              "max": 360
            },
            "randomness": 0,
            "childId": "loop-2"
          }
        ],
        "loop": {
          "repeat": {
            "min": 1,
            "max": 2
          },
          "startNodeId": "node-2",
          "endNodeId": "node-2"
        }
      },
      {
        "id": "loop-2",
        "name": "Verzweigter Ast",
        "draggable": false,
        "graphic": null,
        "incoming": {
          "repeat": {
            "min": 0,
            "max": 5
          },
          "length": {
            "min": 0,
            "max": 24
          },
          "angle": {
            "min": 87,
            "max": 119
          },
          "azimuth": {
            "min": 0,
            "max": 360
          },
          "randomness": 0.7,
          "stem": {
            "color": "#426f50",
            "width": 1.5
          }
        },
        "connections": [],
        "loop": {
          "repeat": {
            "min": 1,
            "max": 6
          },
          "startNodeId": "node-3",
          "endNodeId": "node-3-copy-2"
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
            "min": 4,
            "max": 5
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
            "max": 9
          },
          "length": {
            "min": 38,
            "max": 70
          },
          "angle": {
            "min": 0,
            "max": 39
          },
          "azimuth": {
            "min": 0,
            "max": 0
          },
          "randomness": 0,
          "stem": {
            "color": "#426f50",
            "width": 1
          }
        },
        "connections": [
          {
            "repeat": {
              "min": 4,
              "max": 5
            },
            "length": {
              "min": 21,
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
            "randomness": 0.82,
            "stem": {
              "color": "#426f50",
              "width": 3.5
            },
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
            "min": 4,
            "max": 5
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
          "x": 503.28508796660003,
          "y": 477.1095771773604
        },
        "loop-1": {
          "x": 498.8866147293294,
          "y": 779.9846687548137
        },
        "base": {
          "x": 365.05443702573365,
          "y": 941
        },
        "node-2": {
          "x": 498.8866147293294,
          "y": 779.9846687548137
        },
        "node-3": {
          "x": 496.33857626075917,
          "y": 536.2561019394749
        },
        "node-3-copy": {
          "x": 220.5853349680085,
          "y": 231.2782262527823
        },
        "node-3-copy-2": {
          "x": 511.9327085434087,
          "y": 384.46380846363314
        },
        "node-3-copy-copy": {
          "x": 189.37803603653902,
          "y": 369.9357334969434
        }
      }
    }
  },
  {
    "schemaVersion": 2,
    "id": "margeritenbluete-2",
    "name": "Margeritenblüte",
    "catalogRole": "flower",
    "catalogIcon": {
      "symbol": "✿",
      "color": "#5b8d53"
    },
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
          "orientation": "toward-parent"
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
      }
    ],
    "editor": {
      "nodePositions": {
        "flower-head": {
          "x": 503.61782417374275,
          "y": 868.3350639304808
        },
        "petal": {
          "x": 502.4173349449711,
          "y": 653.2701943209092
        }
      }
    }
  }
];
