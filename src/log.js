export default function LOG(...args) {
    if (process.env.DEBUG) {
        console.log(...args);
    }
}