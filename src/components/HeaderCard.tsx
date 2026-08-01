import { totalSamples } from '@/data/mockData';
import styles from './HeaderCard.module.css';

export function HeaderCard() {
  const count = totalSamples().toLocaleString();
  return (
    <div className={styles.card} role="status" aria-live="polite">
      合計件数: {count} 件
    </div>
  );
}
