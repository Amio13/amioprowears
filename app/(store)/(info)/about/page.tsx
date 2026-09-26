import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "About us",
  description: "Amioprowears prints club and national team jerseys with your name, number and badges, delivered anywhere in Nigeria.",
};

export default function AboutPage() {
  return (
    <>
      <h1>About {STORE.name}</h1>
      <p>
        {STORE.name} makes it easy to get the football jersey you actually want — your club or country, with your name, your number and
        the right badges.
      </p>
      <p>
        Pick a jersey, see your name and number on it before you pay, and choose your badges from clear pictures. We print it, pack it and send it to the motor park
        nearest to you, anywhere in Nigeria.
      </p>
      <h2>Why shop with us</h2>
      <ul>
        <li>See your name and number on the jersey live before you order.</li>
        <li>Clear prices in naira — what you see at checkout is what you pay.</li>
        <li>Secure payment through Paystack.</li>
        <li>Delivery to any motor park in Nigeria, with order tracking.</li>
      </ul>
      <p>
        <Link href="/catalogue">Browse the jerseys</Link> or <Link href="/contact">get in touch</Link>.
      </p>
    </>
  );
}
