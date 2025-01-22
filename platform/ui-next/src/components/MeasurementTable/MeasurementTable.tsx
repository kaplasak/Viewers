import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataRow, PanelSection } from '../../index';
import { createContext } from '../../lib/createContext';

interface MeasurementTableContext {
  data?: any[];
  onAction?: (e, command: string | string[], uid: string) => void;
  disableEditing?: boolean;
}

const [MeasurementTableProvider, useMeasurementTableContext] =
  createContext<MeasurementTableContext>('MeasurementTable', { data: [] });

interface MeasurementDataProps extends MeasurementTableContext {
  title: string;
  children: React.ReactNode;
}

const MeasurementTable = ({
  data = [],
  onAction,
  title,
  children,
  disableEditing = false,
}: MeasurementDataProps) => {
  const { t } = useTranslation('MeasurementTable');
  const amount = data.length;

  return (
    <MeasurementTableProvider
      data={data}
      onAction={onAction}
      disableEditing={disableEditing}
    >
      <PanelSection defaultOpen={true}>
        <PanelSection.Header className="bg-secondary-dark">
          <span>{`${t(title)} (${amount})`}</span>
        </PanelSection.Header>
        <PanelSection.Content>{children}</PanelSection.Content>
      </PanelSection>
    </MeasurementTableProvider>
  );
};

const Header = ({ children }: { children: React.ReactNode }) => {
  return <div className="measurement-table-header">{children}</div>;
};

const Body = () => {
  const { data } = useMeasurementTableContext('MeasurementTable.Body');

  if (!data || data.length === 0) {
    return (
      <div className="text-primary-light mb-1 flex flex-1 items-center px-2 py-2 text-base">
        No tracked measurements
      </div>
    );
  }

  return (
    <div className="measurement-table-body space-y-px">
      {data.map((item, index) => (
        <Row
          key={item.uid}
          item={item}
          index={index}
        />
      ))}
    </div>
  );
};

const Footer = ({ children }: { children: React.ReactNode }) => {
  return <div className="measurement-table-footer">{children}</div>;
};

interface MeasurementItem {
  uid: string;
  label: string;
  colorHex: string;
  isSelected: boolean;
  displayText: { primary: string[]; secondary: string[] };
  isVisible: boolean;
  isLocked: boolean;
  toolName: string;
}

interface RowProps {
  item: MeasurementItem;
  index: number;
}

const Row = ({ item, index }: RowProps) => {
  const { onClick, onAction, disableEditing } = useMeasurementTableContext('MeasurementTable.Row');

  return (
    <DataRow
      key={item.uid}
      description={item.label}
      number={index + 1}
      title={item.label}
      colorHex={item.colorHex}
      isSelected={item.isSelected}
      details={item.displayText}
      onSelect={() => onClick(item.uid)}
      onAction={(e, command) => onAction(e, command, item.uid)}
      disableEditing={disableEditing}
      isVisible={item.isVisible}
      isLocked={item.isLocked}
      // onColor={() => onColor(item.uid)}
    />
  );
};

MeasurementTable.Header = Header;
MeasurementTable.Body = Body;
MeasurementTable.Footer = Footer;
MeasurementTable.Row = Row;

export default MeasurementTable;
