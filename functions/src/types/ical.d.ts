declare module 'ical.js' {
    namespace ICAL {
        function parse(input: string): any;
        class Component {
            constructor(jCal: any);
            getAllSubcomponents(name: string): Component[];
        }
        class Event {
            constructor(component: Component);
            summary: string;
            uid: string;
            startDate: Time;
            endDate: Time;
        }
        class Time {
            toJSDate(): Date;
        }
    }
    export = ICAL;
}
