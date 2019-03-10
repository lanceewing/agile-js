class Defines {

    /* ------------------------ System variables -------------------------- */

    static get CURROOM () { return 0; }           /* current.room */

    static get PREVROOM () { return 1; }          /* previous.room */

    static get EGOEDGE () { return 2; }           /* edge.ego.hit */

    static get SCORE () { return 3; }             /* score */

    static get OBJHIT () { return 4; }            /* obj.hit.edge */

    static get OBJEDGE () { return 5; }           /* edge.obj.hit */

    static get EGODIR () { return 6; }            /* ego's direction */

    static get MAXSCORE () { return 7; }          /* maximum possible score */

    static get MEMLEFT () { return 8; }           /* remaining heap space in pages */

    static get UNKNOWN_WORD () { return 9; }      /* number of unknown word */

    static get ANIMATION_INT () { return 10; }    /* animation interval */

    static get SECONDS () { return 11; }

    static get MINUTES () { return 12; }          /* time since game start */

    static get HOURS () { return 13; }

    static get DAYS () { return 14; }

    static get DBL_CLK_DELAY () { return 15; }

    static get CURRENT_EGO () { return 16; }

    static get ERROR_NUM () { return 17; }

    static get ERROR_PARAM () { return 18; }

    static get LAST_CHAR () { return 19; }

    static get MACHINE_TYPE () { return 20; }

    static get PRINT_TIMEOUT () { return 21; }

    static get NUM_VOICES () { return 22; }

    static get ATTENUATION () { return 23; }

    static get INPUTLEN () { return 24; }

    static get SELECTED_OBJ () { return 25; }     /* selected object number */

    static get MONITOR_TYPE () { return 26; }


    /* ------------------------ System flags ------------------------ */

    static get ONWATER () { return 0; }               /* on.water */

    static get SEE_EGO () { return 1; }               /* can we see ego? */

    static get INPUT () { return 2; }                 /* have.input */

    static get HITSPEC () { return 3; }               /* hit.special */

    static get HADMATCH () { return 4; }              /* had a word match */

    static get INITLOGS () { return 5; }              /* signal to init logics */

    static get RESTART () { return 6; }               /* is a restart in progress? */

    static get NO_SCRIPT () { return 7; }             /* don't add to the script buffer */

    static get DBL_CLK () { return 8; }               /* enable double click on joystick */

    static get SOUNDON () { return 9; }               /* state of sound playing */

    static get TRACE_ENABLE () { return 10; }         /* to enable tracing */

    static get HAS_NOISE () { return 11; }            /* does machine have noise channel */

    static get RESTORE () { return 12; }              /* restore game in progress */

    static get ENABLE_SELECT () { return 13; }        /* allow selection of objects from inventory screen */

    static get ENABLE_MENU () { return 14; }

    static get LEAVE_WIN () { return 15; }            /* leave windows on the screen */

    static get NO_PRMPT_RSTRT () { return 16; }       /* don't prompt on restart */


    /* ------------------------ Miscellaneous ------------------------ */

    static get NUMVARS () { return 256; }             /* number of vars */

    static get NUMFLAGS () { return 256; }            /* number of flags */

    static get NUMCONTROL () { return 50; }           /* number of controllers */

    static get NUMWORDS () { return 10; }             /* maximum # of words recognized in input */

    static get NUMANIMATED () { return 256; }         /* maximum # of animated objects */

    static get MAXVAR () { return 255; }              /* maximum value for a var */

    static get TEXTCOLS () { return 40; }             /* number of columns of text */

    static get TEXTLINES () { return 25; }            /* number of lines of text */

    static get MAXINPUT () { return 40; }             /* maximum length of user input */

    static get DIALOGUE_WIDTH () { return 35; }       /* maximum width of dialog box */

    static get NUMSTRINGS () { return 24; }           /* number of user-definable strings */

    static get STRLENGTH () { return 40; }            /* maximum length of user strings */

    static get GLSIZE () { return 40; }               /* maximum length for GetLine calls, used internally for things like save dialog */

    static get PROMPTSTR () { return 0; }             /* string number of prompt */

    static get ID_LEN () { return 7; }                /* length of gameID string */

    static get MAXDIST () { return 50; }              /* maximum movement distance */

    static get MINDIST () { return 6; }               /* minimum movement distance */


    /* ------------------------ Inventory item constants --------------------------- */

    static get LIMBO () { return 0; }                 /* room number of objects that are gone */

    static get CARRYING () { return 255; }            /* room number of objects in ego's posession */


    /* ------------------------ Default status and input row numbers ------------------------ */

    static get STATUSROW () { return 21; }

    static get INPUTROW () { return 23; }


    /* ------------------------ Screen edges ------------------------ */

    static get TOP () { return 1; }

    static get RIGHT () { return 2; }

    static get BOTTOM () { return 3; }

    static get LEFT () { return 4; }

    static get MINX () { return 0; }

    static get MINY () { return 0; }

    static get MAXX () { return 159; }

    static get MAXY () { return 167; }

    static get HORIZON () { return 36; }

}

// Global var for AGI palette.
AGI_PALETTE = [
    0x000000,
    0x0000AA,
    0x00AA00,
    0x00AAAA,
    0xAA0000,
    0xAA00AA,
    0xAA5500,
    0xAAAAAA,
    0x555555,
    0x5555FF,
    0x55FF55,
    0x55FFFF,
    0xFF5555,
    0xFF55FF,
    0xFFFF55,
    0xFFFFFF
];
