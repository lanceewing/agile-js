class Logic extends Resource {

    constructor(rawData, messagesCrypted = true) {
        super();

        // At the top level, all Instructions are Actions. The Conditions only exist as 
        // members of an IfAction or OrCondition.
        this.actions = [];

        // Holds the messages for this Logic.
        this.messages = [];

        // A Lookup mapping between an address value and the index within the Actions List
        // of the Action that is at that address.
        this.addressToActionIndex = new Map();

        // Whether the messages are crypted or not.
        this.messagesCrypted = messagesCrypted;

        // Decode the raw LOGIC resource data into the Actions and Messages.
        this.decode(rawData);
    }

    /**
     * Decode the raw LOGIC resource data into the Actions and Messages.
     * 
     * @param {*} rawData 
     */
    decode(rawData) {
        // Read the Instructions. The first two bytes are the length of the Instructions section.
        this.readActions(new ByteStream(rawData.slice(2, 2 + (rawData[0] + (rawData[1] << 8)))));

        // Read the messages.
        this.readMessages(rawData);
    }

    /**
     * Reads all Action commands from the given ByteStream.
     * 
     * @param {*} stream The ByteStream to read the Actions from.
     */
    readActions(stream) {
        let action;
        let actionNumber = 0;

        while ((action = this.readAction(stream)) != null)
        {
            this.actions.push(action);
            this.addressToActionIndex.set(action.address, actionNumber++);
        }
    }

    /**
     * Reads an Action from the given Stream. If the end of the Stream has been reached, will return null.
     * 
     * @param {*} stream The ByteStream to read the Action from.
     */
    readAction(stream) {
        let action = null;
        let address = stream.position;
        let actionOpcode = stream.readByte();

        if (actionOpcode >= 0)
        {
            if (actionOpcode == 0xFF)       // IF
            {
                let operands = [];
                let conditions = [];
                let condition = null;

                while ((condition = this.readCondition(stream, 0xFF)) != null)
                {
                    conditions.push(condition);
                }

                operands.push(new Operand(OperandType.TESTLIST, conditions));
                operands.push(new Operand(OperandType.ADDRESS, ((stream.readByte() + (stream.readByte() << 8))) + stream.position));
                action = new IfAction(operands);
            }
            else if (actionOpcode == 0xFE)  // GOTO
            {
                let operands = [];
                operands.push(new Operand(OperandType.ADDRESS, ((stream.readByte() + (stream.readByte() << 8))) + stream.position));
                action = new GotoAction(operands);
            }
            else
            {
                // Otherwise it is a normal Action.
                let operation = ACTION_OPERATIONS[actionOpcode];
                let operands = [];

                for (let operandType of operation.operandTypes)
                {
                    operands.push(new Operand(operandType, stream.readByte()));
                }

                action = new Action(operation, operands);
            }

            // Keep track of each Instruction's address and Logic as we read them in.
            action.address = address;
            action.logic = this;
        }

        return action;
    }

    readCondition(stream, endCode) {
        let condition = null;
        let address = stream.position - 2;
        let conditionOpcode = stream.readByte();

        if (conditionOpcode != endCode) {
            if (conditionOpcode == 0xFC) {        // OR
                let operands = [];
                let conditions = [];
                let orCondition = null;

                while ((orCondition = this.readCondition(stream, 0xFC)) != null) {
                    conditions.push(orCondition);
                }

                operands.push(new Operand(OperandType.TESTLIST, conditions));
                condition = new OrCondition(operands);
            }
            else if (conditionOpcode == 0xFD) {   // NOT
                let operands = [];
                operands.push(new Operand(OperandType.TEST, this.readCondition(stream, 0xFF)));
                condition = new NotCondition(operands);
            }
            else if (conditionOpcode == 0x0E) {   // SAID
                // The said command has a variable number of 16 bit word numbers, so needs special handling.
                let operation = TEST_OPERATIONS[conditionOpcode];
                let operands = [];
                let wordNumbers = [];
                let numOfWords = stream.readByte();

                for (let i=0; i < numOfWords; i++) {
                    wordNumbers.push(stream.readByte() + (stream.readByte() << 8));
                }

                operands.push(new Operand(OperandType.WORDLIST, wordNumbers));
                condition = new Condition(operation, operands);
            }
            else {
                // Otherwise it's a normal condition.
                let operation = TEST_OPERATIONS[conditionOpcode];
                let operands = [];

                for (let operandType of operation.operandTypes) {
                    operands.push(new Operand(operandType, stream.readByte()));
                }

                condition = new Condition(operation, operands);
            }

            // Keep track of each Instruction's address and Logic as we read them in.
            condition.address = address;
            condition.logic = this;
        }

        return condition;
    }

    /**
     * Reads the Logic's messages from the raw data.
     * 
     * @param {*} rawData 
     */
    readMessages(rawData) {
        let messagesOffset = (rawData[0] + (rawData[1] << 8)) + 2;
        let numOfMessages = rawData[messagesOffset + 0];
        let startOfText = messagesOffset + 3 + (numOfMessages * 2);

        if (this.messagesCrypted) {
            // Decrypt the message text section.
            this.crypt(rawData, startOfText, rawData.length);
        }

        // Message numbers start at 1, so we'll set index 0 to empty.
        this.messages.push("");

        // Add each message to the Messages List.
        for (let messNum = 1, marker = messagesOffset + 3; messNum <= numOfMessages; messNum++, marker += 2) {
            // Calculate the start of this message text.
            let msgStart = rawData[marker] + (rawData[marker + 1] << 8);
            let msgText = "";

            // Message text will only exist for those where the start offset is greater than 0.
            if (msgStart > 0) {
                let msgEnd = (msgStart += (messagesOffset + 1));

                // Find the end of the message text. It is 0 terminated.
                while (rawData[msgEnd++] != 0) ;

                // Convert the byte data between the message start and end in to an ASCII string.
                msgText = String.fromCharCode.apply(null, rawData.slice(msgStart, msgEnd - 1));
            }

            this.messages.push(msgText);
        }
    }
    
}

/**
 * Represents an AGI Instruction, being an Operation and it's List of Operands. This class
 * is abstract since all Instructions will be either an Action or a Condition.
 */
class Instruction {

    /**
     * Constructor for Instruction.
     * 
     * @param {*} operation The Operation for this Instruction.
     * @param {*} operands The List of Operands for this Instruction.
     */
    constructor(operation, operands) {
        this.operation = operation;
        this.operands = operands;
        // Holds a reference to the Logic that this Instruction belongs to.
        this.logic = null;
        // The address of this Instruction within the Logic file.
        this.address = null;
    }
}

/**
 * A Condition is a type of AGI Instruction that tests something and returns
 * a boolean value.
 */
class Condition extends Instruction {
    constructor(operation, operands) {
        super(operation, operands);
    }
}

/**
 * An Action is a type of AGI Instruction that performs an action.
 */
class Action extends Instruction {
    constructor(operation, operands) {
        super(operation, operands);
    }
    
    get actionNumber() {
        return this.logic.addressToActionIndex.get(this.address);
    }
}

/**
 * The JumpAction is an abstract base class of both the IfAction and GotoAction.
 */
class JumpAction extends Action {

    constructor(operation, operands) {
        super(operation, operands);
    }

    /**
     * Gets the index of the Action that this JumpAction jumps to.
     */
    getDestinationActionIndex() {
        return this.logic.addressToActionIndex.get(this.getDestinationAddress());
    }

    /**
     * Gets the destination address of this JumpAction.
     */
    getDestinationAddress() {
        // Template method. Sub-classes will override this.
        return 0;
    }
}

/**
 * The IfAction is a special type of AGI Instruction that tests one or more Conditions
 * to decide whether to jump over the block of immediately following Actions. It's operands
 * are a List of Conditions and a jump address.
 */
class IfAction extends JumpAction {

    constructor(operands) {
        super(new Operation(255, "if(TESTLIST,ADDRESS)"), operands);
    }

    getDestinationAddress() {
        return this.operands[1].asInt();
    }
}

/**
 * The GotoAction is a special type of AGI Instruction that performs an unconditional
 * jump to a given address. It's one and only operand is the jump address. This Instruction
 * is mainly used for the 'else' keyword, but also for the 'goto' keyword.
 */
class GotoAction extends JumpAction {

    constructor(operands) {
        super(new Operation(254, "goto(ADDRESS)"), operands);
    }

    getDestinationAddress() {
        return this.operands[0].asInt();
    }
}

/**
 * The NotCondition is a special type of AGI Instruction that tests that the test 
 * command immediately following it evaluates to false. It's one and only operand will
 * be a Condition, and that Condition cannot be an OrCondition.
 */
class NotCondition extends Condition {
    constructor(operands) {
        super(new Operation(253, "not(TEST)"), operands);
    }
}

/**
 * The OrCondition is a special type of AGI Instruction that tests two or more
 * Conditions to see if at least one of them evaluates to true. It's operand is
 * a List of Conditions.
 */
class OrCondition extends Condition {
    constructor(operands) {
        super(new Operation(252, "or(TESTLIST)"), operands);
    }
}

/**
 * The Operation class represents an AGI command, e.g. the add operation, or isset
 * operation. The distinction between the Operation class and the Instruction classes
 * is that an Operation instance holds information about the AGI command, whereas the
 * Instruction classes hold information about an instance of the usage of an AGI 
 * command. So the Operation instances are essentially reference data that is referenced
 * by the Instructions. Multiple Instruction instances can and will refer to the same 
 * Operation.
 */
class Operation {

    /**
     * Constructor for Operation.
     * 
     * @param {*} opcode The AGI opcode or bytecode value for this Operation.
     * @param {*} format A format string that describes the name and arguments for this Operation.
     */
    constructor(opcode, format) {
        this.opcode = opcode;
        this.format = format;
        this.operandTypes = [];

        // Work out the position of the two brackets in the format string.
        let openBracket = format.indexOf("(");
        let closeBracket = format.indexOf(")");

        // The Name is the bit before the open bracket.
        this.name = format.substring(0, openBracket);

        // If the brackets are not next to each other, the operation has operands.
        if ((closeBracket - openBracket) > 1) {
            let operandsStr = format.substring(openBracket + 1, closeBracket);

            for (let operandTypeStr of operandsStr.split(',')) {
                this.operandTypes.push(OperandType.valueOf(operandTypeStr));
            }
        }
    }
}

/**
 * The different types of Operand that the AGI Action and Condition instructions can have.
 */
class OperandType {

    static get VAR() { return 0; }
    static get NUM() { return 1; }
    static get FLAG() { return 2; }
    static get OBJECT() { return 3; }
    static get WORDLIST() { return 4; }
    static get VIEW() { return 5; }
    static get MSGNUM() { return 6; }
    static get TEST() { return 7; }
    static get TESTLIST() { return 8; }
    static get ADDRESS() { return 9; }

    static valueOf(name) {
        switch (name) {
            case "VAR": return OperandType.VAR;
            case "NUM": return OperandType.NUM;
            case "FLAG": return OperandType.FLAG;
            case "OBJECT": return OperandType.OBJECT;
            case "WORDLIST": return OperandType.WORDLIST;
            case "VIEW": return OperandType.VIEW;
            case "MSGNUM": return OperandType.MSGNUM;
            case "TEST": return OperandType.TEST;
            case "TESTLIST": return OperandType.TESTLIST;
            case "ADDRESS": return OperandType.ADDRESS;
            default: return null;
        }
    }
}

/**
 * An Instruction usually has one or more Operands, although there are some that don't. An
 * Operand is of a particular OperandType and has a Value.
 */
class Operand {

    /**
     * Constructor for Operand.
     * 
     * @param {*} operandType The OperandType for this Operand.
     * @param {*} value The value for this Operand.
     */
    constructor(operandType, value) {
        this.operandType = operandType;
        this.value = value;
    }

    /**
     * Gets the Operand's value as an int.
     */
    asInt() {
        return (value & 0xFFFFFFFF);
    }

    /**
     * Gets the Operand's value as a short.
     */
    asShort() {
        return (value & 0xFFFF);
    }

    /**
     * Gets the Operand's value as a byte.
     */
    asByte() {
        return (value & 0xFF);
    }

    /**
     * Gets the Operand's value as a signed byte.
     */
    asSByte() {
        if ((value & 0x80) == 0x80) {
            return ((~value + 1) & 0xFF);
        } else {
            return value;
        }
    }

    /**
     * Gets the Operand's value as a Condition.
     */
    asCondition()  {
        return value;
    }

    /**
     * Gets the Operand's value as a List of Conditions.
     */
    asConditions() {
        return value;
    }

    /**
     * Gets the Operand's value as a List of ints.
     */
    asInts() {
        return value;
    }
}

// Glocal array of the AGI TEST Operations.
const TEST_OPERATIONS = [
    null,
    new Operation(1, "equaln(VAR,NUM)"),
    new Operation(2, "equalv(VAR,VAR)"),
    new Operation(3, "lessn(VAR,NUM)"),
    new Operation(4, "lessv(VAR,VAR)"),
    new Operation(5, "greatern(VAR,NUM)"),
    new Operation(6, "greaterv(VAR,VAR)"),
    new Operation(7, "isset(FLAG)"),
    new Operation(8, "isset.v(VAR)"),
    new Operation(9, "has(OBJECT)"),
    new Operation(10, "obj.in.room(OBJECT,VAR)"),
    new Operation(11, "posn(OBJECT,NUM,NUM,NUM,NUM)"),
    new Operation(12, "controller(NUM)"),
    new Operation(13, "have.key()"),
    new Operation(14, "said(WORDLIST)"),
    new Operation(15, "compare.strings(NUM,NUM)"),
    new Operation(16, "obj.in.box(OBJECT,NUM,NUM,NUM,NUM)"),
    new Operation(17, "center.posn(OBJECT,NUM,NUM,NUM,NUM)"),
    new Operation(18, "right.posn(OBJECT,NUM,NUM,NUM,NUM)")
];

// Global array of the AGI ACTION Operations.
const ACTION_OPERATIONS = [
    new Operation(0, "return()"),
    new Operation(1, "increment(VAR)"),
    new Operation(2, "decrement(VAR)"),
    new Operation(3, "assignn(VAR,NUM)"),
    new Operation(4, "assignv(VAR,VAR)"),
    new Operation(5, "addn(VAR,NUM)"),
    new Operation(6, "addv(VAR,VAR)"),
    new Operation(7, "subn(VAR,NUM)"),
    new Operation(8, "subv(VAR,VAR)"),
    new Operation(9, "lindirectv(VAR,VAR)"),
    new Operation(10, "rindirect(VAR,VAR)"),
    new Operation(11, "lindirectn(VAR,NUM)"),
    new Operation(12, "set(FLAG)"),
    new Operation(13, "reset(FLAG)"),
    new Operation(14, "toggle(FLAG)"),
    new Operation(15, "set.v(VAR)"),
    new Operation(16, "reset.v(VAR)"),
    new Operation(17, "toggle.v(VAR)"),
    new Operation(18, "new.room(NUM)"),
    new Operation(19, "new.room.f(VAR)"),
    new Operation(20, "load.logics(NUM)"),
    new Operation(21, "load.logics.f(VAR)"),
    new Operation(22, "call(NUM)"),
    new Operation(23, "call.f(VAR)"),
    new Operation(24, "load.pic(VAR)"),
    new Operation(25, "draw.pic(VAR)"),
    new Operation(26, "show.pic()"),
    new Operation(27, "discard.pic(VAR)"),
    new Operation(28, "overlay.pic(VAR)"),
    new Operation(29, "show.pri.screen()"),
    new Operation(30, "load.view(VIEW)"),
    new Operation(31, "load.view.f(VAR)"),
    new Operation(32, "discard.view(VIEW)"),
    new Operation(33, "animate.obj(OBJECT)"),
    new Operation(34, "unanimate.all()"),
    new Operation(35, "draw(OBJECT)"),
    new Operation(36, "erase(OBJECT)"),
    new Operation(37, "position(OBJECT,NUM,NUM)"),
    new Operation(38, "position.f(OBJECT,VAR,VAR)"),
    new Operation(39, "get.posn(OBJECT,VAR,VAR)"),
    new Operation(40, "reposition(OBJECT,VAR,VAR)"),
    new Operation(41, "set.view(OBJECT,VIEW)"),
    new Operation(42, "set.view.f(OBJECT,VAR)"),
    new Operation(43, "set.loop(OBJECT,NUM)"),
    new Operation(44, "set.loop.f(OBJECT,VAR)"),
    new Operation(45, "fix.loop(OBJECT)"),
    new Operation(46, "release.loop(OBJECT)"),
    new Operation(47, "set.cel(OBJECT,NUM)"),
    new Operation(48, "set.cel.f(OBJECT,VAR)"),
    new Operation(49, "last.cel(OBJECT,VAR)"),
    new Operation(50, "current.cel(OBJECT,VAR)"),
    new Operation(51, "current.loop(OBJECT,VAR)"),
    new Operation(52, "current.view(OBJECT,VAR)"),
    new Operation(53, "number.of.loops(OBJECT,VAR)"),
    new Operation(54, "set.priority(OBJECT,NUM)"),
    new Operation(55, "set.priority.f(OBJECT,VAR)"),
    new Operation(56, "release.priority(OBJECT)"),
    new Operation(57, "get.priority(OBJECT,VAR)"),
    new Operation(58, "stop.update(OBJECT)"),
    new Operation(59, "start.update(OBJECT)"),
    new Operation(60, "force.update(OBJECT)"),
    new Operation(61, "ignore.horizon(OBJECT)"),
    new Operation(62, "observe.horizon(OBJECT)"),
    new Operation(63, "set.horizon(NUM)"),
    new Operation(64, "object.on.water(OBJECT)"),
    new Operation(65, "object.on.land(OBJECT)"),
    new Operation(66, "object.on.anything(OBJECT)"),
    new Operation(67, "ignore.objs(OBJECT)"),
    new Operation(68, "observe.objs(OBJECT)"),
    new Operation(69, "distance(OBJECT,OBJECT,VAR)"),
    new Operation(70, "stop.cycling(OBJECT)"),
    new Operation(71, "start.cycling(OBJECT)"),
    new Operation(72, "normal.cycle(OBJECT)"),
    new Operation(73, "end.of.loop(OBJECT,FLAG)"),
    new Operation(74, "reverse.cycle(OBJECT)"),
    new Operation(75, "reverse.loop(OBJECT,FLAG)"),
    new Operation(76, "cycle.time(OBJECT,VAR)"),
    new Operation(77, "stop.motion(OBJECT)"),
    new Operation(78, "start.motion(OBJECT)"),
    new Operation(79, "step.size(OBJECT,VAR)"),
    new Operation(80, "step.time(OBJECT,VAR)"),
    new Operation(81, "move.obj(OBJECT,NUM,NUM,NUM,FLAG)"),
    new Operation(82, "move.obj.f(OBJECT,VAR,VAR,VAR,FLAG)"),
    new Operation(83, "follow.ego(OBJECT,NUM,FLAG)"),
    new Operation(84, "wander(OBJECT)"),
    new Operation(85, "normal.motion(OBJECT)"),
    new Operation(86, "set.dir(OBJECT,VAR)"),
    new Operation(87, "get.dir(OBJECT,VAR)"),
    new Operation(88, "ignore.blocks(OBJECT)"),
    new Operation(89, "observe.blocks(OBJECT)"),
    new Operation(90, "block(NUM,NUM,NUM,NUM)"),
    new Operation(91, "unblock()"),
    new Operation(92, "get(OBJECT)"),
    new Operation(93, "get.f(VAR)"),
    new Operation(94, "drop(OBJECT)"),
    new Operation(95, "put(OBJECT,VAR)"),
    new Operation(96, "put.f(VAR,VAR)"),
    new Operation(97, "get.room.f(VAR,VAR)"),
    new Operation(98, "load.sound(NUM)"),
    new Operation(99, "sound(NUM,FLAG)"),
    new Operation(100, "stop.sound()"),
    new Operation(101, "print(MSGNUM)"),
    new Operation(102, "print.f(VAR)"),
    new Operation(103, "display(NUM,NUM,MSGNUM)"),
    new Operation(104, "display.f(VAR,VAR,VAR)"),
    new Operation(105, "clear.lines(NUM,NUM,NUM)"),
    new Operation(106, "text.screen()"),
    new Operation(107, "graphics()"),
    new Operation(108, "set.cursor.char(MSGNUM)"),
    new Operation(109, "set.text.attribute(NUM,NUM)"),
    new Operation(110, "shake.screen(NUM)"),
    new Operation(111, "configure.screen(NUM,NUM,NUM)"),
    new Operation(112, "status.line.on()"),
    new Operation(113, "status.line.off()"),
    new Operation(114, "set.string(NUM,MSGNUM)"),
    new Operation(115, "get.string(NUM,MSGNUM,NUM,NUM,NUM)"),
    new Operation(116, "word.to.string(NUM,NUM)"),
    new Operation(117, "parse(NUM)"),
    new Operation(118, "get.num(MSGNUM,VAR)"),
    new Operation(119, "prevent.input()"),
    new Operation(120, "accept.input()"),
    new Operation(121, "set.key(NUM,NUM,NUM)"),
    new Operation(122, "add.to.pic(VIEW,NUM,NUM,NUM,NUM,NUM,NUM)"),
    new Operation(123, "add.to.pic.f(VAR,VAR,VAR,VAR,VAR,VAR,VAR)"),
    new Operation(124, "status()"),
    new Operation(125, "save.game()"),
    new Operation(126, "restore.game()"),
    new Operation(127, "init.disk()"),
    new Operation(128, "restart.game()"),
    new Operation(129, "show.obj(VIEW)"),
    new Operation(130, "random(NUM,NUM,VAR)"),
    new Operation(131, "program.control()"),
    new Operation(132, "player.control()"),
    new Operation(133, "obj.status.f(VAR)"),
    new Operation(134, "quit(NUM)"),                          // Remove parameter for AGI v2.001/v2.089
    new Operation(135, "show.mem()"),
    new Operation(136, "pause()"),
    new Operation(137, "echo.line()"),
    new Operation(138, "cancel.line()"),
    new Operation(139, "init.joy()"),
    new Operation(140, "toggle.monitor()"),
    new Operation(141, "version()"),
    new Operation(142, "script.size(NUM)"),
    new Operation(143, "set.game.id(MSGNUM)"),           // Command is max.drawn(NUM) for AGI v2.001
    new Operation(144, "log(MSGNUM)"),
    new Operation(145, "set.scan.start()"),
    new Operation(146, "reset.scan.start()"),
    new Operation(147, "reposition.to(OBJECT,NUM,NUM)"),
    new Operation(148, "reposition.to.f(OBJECT,VAR,VAR)"),
    new Operation(149, "trace.on()"),
    new Operation(150, "trace.info(NUM,NUM,NUM)"),
    new Operation(151, "print.at(MSGNUM,NUM,NUM,NUM)"),
    new Operation(152, "print.at.v(VAR,NUM,NUM,NUM)"),
    new Operation(153, "discard.view.v(VAR)"),
    new Operation(154, "clear.text.rect(NUM,NUM,NUM,NUM,NUM)"),
    new Operation(155, "set.upper.left(NUM,NUM)"),
    new Operation(156, "set.menu(MSGNUM)"),
    new Operation(157, "set.menu.item(MSGNUM,NUM)"),
    new Operation(158, "submit.menu()"),
    new Operation(159, "enable.item(NUM)"),
    new Operation(160, "disable.item(NUM)"),
    new Operation(161, "menu.input()"),
    new Operation(162, "show.obj.v(VAR)"),
    new Operation(163, "open.dialogue()"),
    new Operation(164, "close.dialogue()"),
    new Operation(165, "mul.n(VAR,NUM)"),
    new Operation(166, "mul.v(VAR,VAR)"),
    new Operation(167, "div.n(VAR,NUM)"),
    new Operation(168, "div.v(VAR,VAR)"),
    new Operation(169, "close.window()"),
    new Operation(170, "set.simple(NUM)"),
    new Operation(171, "push.script()"),
    new Operation(172, "pop.script()"),
    new Operation(173, "hold.key()"),
    new Operation(174, "set.pri.base(NUM)"),
    new Operation(175, "discard.sound(NUM)"),
    new Operation(176, "hide.mouse()"),
    new Operation(177, "allow.menu(NUM)"),
    new Operation(178, "show.mouse()"),
    new Operation(179, "fence.mouse(NUM,NUM,NUM,NUM)"),
    new Operation(180, "mouse.posn(VAR,VAR)"),
    new Operation(181, "release.key()"),
    new Operation(182, "adj.ego.move.to.x.y(NUM,NUM)")
];