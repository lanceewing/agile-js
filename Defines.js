class Defines {

    constructor() {

    }

    /* ------------------------ System variables -------------------------- */

    static CURROOM = 0;           /* current.room */

    static PREVROOM = 1;          /* previous.room */

    static EGOEDGE = 2;           /* edge.ego.hit */

    static SCORE = 3;             /* score */

    static OBJHIT = 4;            /* obj.hit.edge */

    static OBJEDGE = 5;           /* edge.obj.hit */

    static EGODIR = 6;            /* ego's direction */

    static MAXSCORE = 7;          /* maximum possible score */

    static MEMLEFT = 8;           /* remaining heap space in pages */

    static UNKNOWN_WORD = 9;      /* number of unknown word */

    static ANIMATION_INT = 10;    /* animation interval */

    static SECONDS = 11;

    static MINUTES = 12;          /* time since game start */

    static HOURS = 13;

    static DAYS = 14;

    static DBL_CLK_DELAY = 15;

    static CURRENT_EGO = 16;

    static ERROR_NUM = 17;

    static ERROR_PARAM = 18;

    static LAST_CHAR = 19;

    static MACHINE_TYPE = 20;

    static PRINT_TIMEOUT = 21;

    static NUM_VOICES = 22;

    static ATTENUATION = 23;

    static INPUTLEN = 24;

    static SELECTED_OBJ = 25;     /* selected object number */

    static MONITOR_TYPE = 26;


    /* ------------------------ System flags ------------------------ */

    static ONWATER = 0;               /* on.water */

    static SEE_EGO = 1;               /* can we see ego? */

    static INPUT = 2;                 /* have.input */

    static HITSPEC = 3;               /* hit.special */

    static HADMATCH = 4;              /* had a word match */

    static INITLOGS = 5;              /* signal to init logics */

    static RESTART = 6;               /* is a restart in progress? */

    static NO_SCRIPT = 7;             /* don't add to the script buffer */

    static DBL_CLK = 8;               /* enable double click on joystick */

    static SOUNDON = 9;               /* state of sound playing */

    static TRACE_ENABLE = 10;         /* to enable tracing */

    static HAS_NOISE = 11;            /* does machine have noise channel */

    static RESTORE = 12;              /* restore game in progress */

    static ENABLE_SELECT = 13;        /* allow selection of objects from inventory screen */

    static ENABLE_MENU = 14;

    static LEAVE_WIN = 15;            /* leave windows on the screen */

    static NO_PRMPT_RSTRT = 16;       /* don't prompt on restart */


    /* ------------------------ Miscellaneous ------------------------ */

    static NUMVARS = 256;             /* number of vars */

    static NUMFLAGS = 256;            /* number of flags */

    static NUMCONTROL = 50;           /* number of controllers */

    static NUMWORDS = 10;             /* maximum # of words recognized in input */

    static NUMANIMATED = 256;         /* maximum # of animated objects */

    static MAXVAR = 255;              /* maximum value for a var */

    static TEXTCOLS = 40;             /* number of columns of text */

    static TEXTLINES = 25;            /* number of lines of text */

    static MAXINPUT = 40;             /* maximum length of user input */

    static DIALOGUE_WIDTH = 35;       /* maximum width of dialog box */

    static NUMSTRINGS = 24;           /* number of user-definable strings */

    static STRLENGTH = 40;            /* maximum length of user strings */

    static GLSIZE = 40;               /* maximum length for GetLine calls, used internally for things like save dialog */

    static PROMPTSTR = 0;             /* string number of prompt */

    static ID_LEN = 7;                /* length of gameID string */

    static MAXDIST = 50;              /* maximum movement distance */

    static MINDIST = 6;               /* minimum movement distance */


    /* ------------------------ Inventory item constants --------------------------- */

    static LIMBO = 0;                 /* room number of objects that are gone */

    static CARRYING = 255;            /* room number of objects in ego's posession */


    /* ------------------------ Default status and input row numbers ------------------------ */

    static STATUSROW = 21;

    static INPUTROW = 23;


    /* ------------------------ Screen edges ------------------------ */

    static TOP = 1;

    static RIGHT = 2;

    static BOTTOM = 3;

    static LEFT = 4;

    static MINX = 0;

    static MINY = 0;

    static MAXX = 159;

    static MAXY = 167;

    static HORIZON = 36;

}