"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { faqs } from "./mockData";
import styles from "./homeSections.module.css";

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function FaqSection() {
  const [expandedIndex, setExpandedIndex] = useState<number>(-1);
  const sectionRef = useRef<HTMLElement>(null);

  const toggle = (index: number) => {
    setExpandedIndex((current) => (current === index ? -1 : index));
  };

  return (
    <section ref={sectionRef} className={styles.faqSection} id="faq">
      <div className={styles.faqHeader}>
        <h3 data-aos="fade-up" className={`${styles.faqTitle}`}>
          Frequently Asked Questions
        </h3>
        <p data-aos="fade-up" className={`${styles.faqSubtitle}`}>
          Got questions? We&apos;ve got answers to help you navigate your rental
          experience!
        </p>
        <Link
          data-aos="fade-up"
          href="/contact"
          className={`${styles.blackButton}`}
          data-text="Help Center"
        >
          <span>Help Center</span>
        </Link>
      </div>

      <div className={styles.containerFluid}>
        <div data-aos="fade-up" className={`${styles.faqList}`}>
          {faqs.map((faq, index) => {
            const isOpen = expandedIndex === index;
            const itemClass = `${styles.faqItem} ${
              isOpen ? styles.expanded : ""
            }`;
            return (
              <div key={faq.question} className={itemClass}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <h4>{faq.question}</h4>
                  <span className={styles.faqToggle}>
                    {isOpen ? <MinusIcon /> : <PlusIcon />}
                  </span>
                </button>
                <div className={styles.faqAnswer}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
