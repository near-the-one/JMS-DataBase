import { totalSamples } from '@/data/mockData';
import styles from './HeaderCard.module.css';
import common from './common.module.css';

export function HeaderCard(): JSX.Element {
  const count = totalSamples().toLocaleString();
  return (
    <div className={common.card} role="status" aria-live="polite">
      合計件数: {count} 件
    </div>
  );
}
