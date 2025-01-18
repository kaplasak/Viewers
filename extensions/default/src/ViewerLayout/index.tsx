import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { LoadingIndicatorProgress, InvestigationalUseDialog } from '@ohif/ui';
import { HangingProtocolService, CommandsManager } from '@ohif/core';
import { useAppConfig } from '@state';
import ViewerHeader from './ViewerHeader';
import SidePanelWithServices from '../Components/SidePanelWithServices';
import { Onboarding, ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@ohif/ui-next';
import { panelGroupDefination } from './constants/panels';

function ViewerLayout({
  // From Extension Module Params
  extensionManager,
  servicesManager,
  hotkeysManager,
  commandsManager,
  // From Modes
  viewports,
  ViewportGridComp,
  leftPanelClosed = false,
  rightPanelClosed = false,
  leftPanelResizable = false,
  rightPanelResizable = false,
}: withAppTypes): React.FunctionComponent {
  const [appConfig] = useAppConfig();

  const { panelService, hangingProtocolService } = servicesManager.services;
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(appConfig.showLoadingIndicator);

  const hasPanels = useCallback(
    (side): boolean => !!panelService.getPanels(side).length,
    [panelService]
  );

  const [hasRightPanels, setHasRightPanels] = useState(hasPanels('right'));
  const [hasLeftPanels, setHasLeftPanels] = useState(hasPanels('left'));
  const [leftPanelClosedState, setLeftPanelClosed] = useState(leftPanelClosed);
  const [rightPanelClosedState, setRightPanelClosed] = useState(rightPanelClosed);
  const [leftPanelExpandedWidth, setLeftPanelExpandedWidth] = useState(
    panelGroupDefination.left.expandedDefaultWidth
  );
  const [rightPanelExpandedWidth, setRightPanelExpandedWidth] = useState(
    panelGroupDefination.right.expandedDefaultWidth
  );
  const [leftResizablePanelDefaultSize, setLeftResizePanelDefaultSize] = useState(0);
  const [rightResizePanelDefaultSize, setRightResizePanelDefaultSize] = useState(0);
  const [leftRizeablePanelCollapsedSize, setLeftResizePanelCollapsedSize] = useState(0);
  const [rightResizePanelCollapsedSize, setRightResizePanelCollapsedSize] = useState(0);
  const [resizablePanelGroupElem, setResizablePanelGroupElem] = useState(null);
  const resizableLeftPanelRef = useRef(null);
  const resizableRightPanelRef = useRef(null);

  // This useLayoutEffect is used to...
  // - Grab a reference to the resizable panel group whose width is needed for
  //   converting to percentages in various callbacks.
  // - Expand those panels that are initially expanded.
  useLayoutEffect(() => {
    const panelGroup = document.querySelector(
      `[data-panel-group-id="${panelGroupDefination.groupId}"]`
    );

    setResizablePanelGroupElem(panelGroup);
    const { width: panelGroupWidth } = panelGroup.getBoundingClientRect();

    const rightResizeablePanelExpandedSize =
      (panelGroupDefination.right.initialExpandedDefaultOffsetWidth / panelGroupWidth) * 100;

    const leftResizeablePanelExpandedSize =
      (panelGroupDefination.left.initialExpandedDefaultOffsetWidth / panelGroupWidth) * 100;

    // Since both resizable panels are collapsed by default (i.e. their default size is zero),
    // on the very first render check if either/both side panels should be expanded.
    // If so, then check if there is space to expand either panel and expand them
    // with the appropriate size.
    if (!leftPanelClosed) {
      resizableLeftPanelRef?.current?.expand(leftResizeablePanelExpandedSize);
    }

    if (!rightPanelClosed) {
      resizableRightPanelRef?.current?.expand(rightResizeablePanelExpandedSize);
    }
  }, []); // no dependencies because this useLayoutEffect is only needed on the first render

  // This useLayoutEffect follows the pattern prescribed by the react-resizable-panels
  // readme for converting between pixel values and percentages. An example of
  // the pattern can be found here:
  // https://github.com/bvaughn/react-resizable-panels/issues/46#issuecomment-1368108416
  // This useLayoutEffect is used to...
  // - Add a resize observer to the resizable panel group to reset various state
  //   values whenever the resizable panel group is resized (e.g. whenever the
  //   browser window is resized).
  useLayoutEffect(() => {
    let isFirstResize = true;

    const panelGroup = document.querySelector(
      `[data-panel-group-id="${panelGroupDefination.groupId}"]`
    );

    // This observer kicks in when the ViewportLayout resizable panel group
    // component is resized. This typically occurs when the browser window resizes.
    const observer = new ResizeObserver(() => {
      const { width: panelGroupWidth } = panelGroup.getBoundingClientRect();
      const defaultLeftSize =
        (panelGroupDefination.left.expandedDefaultOffsetWidth / panelGroupWidth) * 100;
      const defaultRightSize =
        (panelGroupDefination.right.expandedDefaultOffsetWidth / panelGroupWidth) * 100;

      // Set the new default and collapsed resizable panel sizes.
      setLeftResizePanelDefaultSize(Math.min(50, defaultLeftSize));
      setRightResizePanelDefaultSize(Math.min(50, defaultRightSize));

      setLeftResizePanelCollapsedSize(
        (panelGroupDefination.left.collapsedOffsetWidth / panelGroupWidth) * 100
      );
      setRightResizePanelCollapsedSize(
        (panelGroupDefination.right.collapsedOffsetWidth / panelGroupWidth) * 100
      );

      if (isFirstResize) {
        isFirstResize = false;
        return;
      }

      // Determine the current widths of the two side panels.
      let leftPanelOffsetWidth = resizableLeftPanelRef.current.isCollapsed()
        ? panelGroupDefination.left.collapsedOffsetWidth
        : leftPanelExpandedWidth + panelGroupDefination.shared.expandedInsideBorderSize;

      let rightPanelOffsetWidth = resizableRightPanelRef.current.isCollapsed()
        ? panelGroupDefination.right.collapsedOffsetWidth
        : rightPanelExpandedWidth + panelGroupDefination.shared.expandedInsideBorderSize;

      if (!resizableLeftPanelRef.current.isCollapsed()) {
        // Check if there is enough space to show both panels at their widths prior to the panel group resize.
        if (leftPanelOffsetWidth + rightPanelOffsetWidth > panelGroupWidth) {
          // There is not enough space to show both panels at their pre-resize widths.
          // Note that at this point, the viewport grid component is zero width.
          // Reduce the left panel width so that both panels fit.
          leftPanelOffsetWidth = Math.max(
            panelGroupWidth - rightPanelOffsetWidth,
            panelGroupDefination.left.expandedDefaultOffsetWidth
          );
          setLeftPanelExpandedWidth(
            leftPanelOffsetWidth - panelGroupDefination.shared.expandedInsideBorderSize
          );
          resizableLeftPanelRef.current.resize((leftPanelOffsetWidth / panelGroupWidth) * 100);
        } else {
          // Maintain the left panel's pre-resize width.
          const leftSize =
            ((leftPanelExpandedWidth + panelGroupDefination.shared.expandedInsideBorderSize) /
              panelGroupWidth) *
            100;
          if (leftSize < leftResizablePanelDefaultSize) {
            // We are resizing to something less than the previous min size.
            // However a new up-to-date min size will be set on the next render, so resize after that.
            window.setTimeout(() => resizableLeftPanelRef.current.resize(leftSize), 0);
          } else {
            resizableLeftPanelRef.current.resize(leftSize);
          }
        }
      }

      if (!resizableRightPanelRef.current.isCollapsed()) {
        // Check if there is enough space to show both panels at their widths prior to the panel group resize.
        if (rightPanelOffsetWidth + leftPanelOffsetWidth > panelGroupWidth) {
          // There is not enough space to show both panels at their pre-resize widths.
          // Note that at this point, the viewport grid component is zero width.
          // Reduce the right panel width so that both panels fit.
          rightPanelOffsetWidth = Math.max(
            panelGroupWidth - leftPanelOffsetWidth,
            panelGroupDefination.right.expandedDefaultOffsetWidth
          );
          setRightPanelExpandedWidth(
            rightPanelOffsetWidth - panelGroupDefination.shared.expandedInsideBorderSize
          );
          resizableRightPanelRef.current.resize((rightPanelOffsetWidth / panelGroupWidth) * 100);
        } else {
          // Maintain the right panel's pre-resize width.
          const rightSize =
            ((rightPanelExpandedWidth + panelGroupDefination.shared.expandedInsideBorderSize) /
              panelGroupWidth) *
            100;
          if (rightSize < rightResizePanelDefaultSize) {
            // We are resizing to something less than the previous min size.
            // However a new up-to-date min size will be set on the next render, so resize after that.
            window.setTimeout(() => resizableRightPanelRef.current.resize(rightSize), 0);
          } else {
            resizableRightPanelRef.current.resize(rightSize);
          }
        }
      }
    });

    observer.observe(panelGroup);

    return () => {
      observer.disconnect();
    };
  }, [
    leftPanelExpandedWidth,
    rightPanelExpandedWidth,
    leftResizablePanelDefaultSize,
    rightResizePanelDefaultSize,
  ]);

  const onLeftPanelClose = useCallback(() => {
    setLeftPanelClosed(true);
    resizableLeftPanelRef?.current?.collapse();
  }, []);

  const onLeftPanelOpen = useCallback(() => {
    resizableLeftPanelRef?.current?.expand();
    setLeftPanelClosed(false);
  }, []);

  const onLeftPanelResize = useCallback(
    size => {
      if (!resizablePanelGroupElem || resizableLeftPanelRef?.current?.isCollapsed()) {
        return;
      }
      // const size = resizableLeftPanelRef?.current?.getSize();
      const { width: panelGroupWidth } = resizablePanelGroupElem.getBoundingClientRect();
      setLeftPanelExpandedWidth(
        (size / 100) * panelGroupWidth - panelGroupDefination.shared.expandedInsideBorderSize
      );
    },
    [resizablePanelGroupElem]
  );

  const onRightPanelClose = useCallback(() => {
    setRightPanelClosed(true);
    resizableRightPanelRef?.current?.collapse();
  }, []);

  const onRightPanelOpen = useCallback(() => {
    resizableRightPanelRef?.current?.expand();
    setRightPanelClosed(false);
  }, []);

  const onRightPanelResize = useCallback(
    size => {
      if (!resizablePanelGroupElem || resizableRightPanelRef?.current?.isCollapsed()) {
        return;
      }
      const { width: panelGroupWidth } = resizablePanelGroupElem.getBoundingClientRect();
      setRightPanelExpandedWidth(
        (size / 100) * panelGroupWidth - panelGroupDefination.shared.expandedInsideBorderSize
      );
    },
    [resizablePanelGroupElem]
  );

  /**
   * Set body classes (tailwindcss) that don't allow vertical
   * or horizontal overflow (no scrolling). Also guarantee window
   * is sized to our viewport.
   */
  useEffect(() => {
    document.body.classList.add('bg-black');
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('bg-black');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const getComponent = id => {
    const entry = extensionManager.getModuleEntry(id);

    if (!entry || !entry.component) {
      throw new Error(
        `${id} is not valid for an extension module or no component found from extension ${id}. Please verify your configuration or ensure that the extension is properly registered. It's also possible that your mode is utilizing a module from an extension that hasn't been included in its dependencies (add the extension to the "extensionDependencies" array in your mode's index.js file). Check the reference string to the extension in your Mode configuration`
      );
    }

    return { entry, content: entry.component };
  };

  useEffect(() => {
    const { unsubscribe } = hangingProtocolService.subscribe(
      HangingProtocolService.EVENTS.PROTOCOL_CHANGED,

      // Todo: right now to set the loading indicator to false, we need to wait for the
      // hangingProtocolService to finish applying the viewport matching to each viewport,
      // however, this might not be the only approach to set the loading indicator to false. we need to explore this further.
      () => {
        setShowLoadingIndicator(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [hangingProtocolService]);

  const getViewportComponentData = viewportComponent => {
    const { entry } = getComponent(viewportComponent.namespace);

    return {
      component: entry.component,
      displaySetsToDisplay: viewportComponent.displaySetsToDisplay,
    };
  };

  useEffect(() => {
    const { unsubscribe } = panelService.subscribe(
      panelService.EVENTS.PANELS_CHANGED,
      ({ options }) => {
        setHasLeftPanels(hasPanels('left'));
        setHasRightPanels(hasPanels('right'));
        if (options?.leftPanelClosed !== undefined) {
          setLeftPanelClosed(options.leftPanelClosed);
        }
        if (options?.rightPanelClosed !== undefined) {
          setRightPanelClosed(options.rightPanelClosed);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [panelService, hasPanels]);

  const viewportComponents = viewports.map(getViewportComponentData);

  return (
    <div>
      <ViewerHeader
        hotkeysManager={hotkeysManager}
        extensionManager={extensionManager}
        servicesManager={servicesManager}
        appConfig={appConfig}
      />
      <div
        className="relative flex w-full flex-row flex-nowrap items-stretch overflow-hidden bg-black"
        style={{ height: 'calc(100vh - 52px' }}
      >
        <React.Fragment>
          {showLoadingIndicator && <LoadingIndicatorProgress className="h-full w-full bg-black" />}
          <ResizablePanelGroup
            direction="horizontal"
            id={panelGroupDefination.groupId}
          >
            {/* LEFT SIDEPANELS */}

            {hasLeftPanels ? (
              <>
                <ResizablePanel
                  defaultSize={leftResizablePanelDefaultSize}
                  minSize={leftResizablePanelDefaultSize}
                  onResize={onLeftPanelResize}
                  collapsible={true}
                  collapsedSize={leftRizeablePanelCollapsedSize}
                  onCollapse={() => setLeftPanelClosed(true)}
                  onExpand={() => setLeftPanelClosed(false)}
                  ref={resizableLeftPanelRef}
                  order={0}
                  id={'viewerLayoutResizableLeftPanel'}
                >
                  <SidePanelWithServices
                    side="left"
                    isExpanded={!leftPanelClosedState}
                    servicesManager={servicesManager}
                    expandedWidth={leftPanelExpandedWidth}
                    collapsedWidth={panelGroupDefination.shared.collapsedWidth}
                    collapsedInsideBorderSize={
                      panelGroupDefination.shared.collapsedInsideBorderSize
                    }
                    collapsedOutsideBorderSize={
                      panelGroupDefination.shared.collapsedOutsideBorderSize
                    }
                    expandedInsideBorderSize={panelGroupDefination.shared.expandedInsideBorderSize}
                    onClose={onLeftPanelClose}
                    onOpen={onLeftPanelOpen}
                  />
                </ResizablePanel>
                <ResizableHandle
                  disabled={!leftPanelResizable}
                  className="!w-0"
                />
              </>
            ) : null}
            {/* TOOLBAR + GRID */}
            <ResizablePanel
              order={1}
              id={'viewerLayoutResizableViewportGridPanel'}
            >
              <div className="flex h-full flex-1 flex-col">
                <div className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-black">
                  <ViewportGridComp
                    servicesManager={servicesManager}
                    viewportComponents={viewportComponents}
                    commandsManager={commandsManager}
                  />
                </div>
              </div>
            </ResizablePanel>
            {hasRightPanels ? (
              <>
                <ResizableHandle
                  disabled={!rightPanelResizable}
                  className="!w-0"
                />
                <ResizablePanel
                  defaultSize={rightResizePanelDefaultSize}
                  minSize={rightResizePanelDefaultSize}
                  onResize={onRightPanelResize}
                  collapsible={true}
                  collapsedSize={rightResizePanelCollapsedSize}
                  onCollapse={() => setRightPanelClosed(true)}
                  onExpand={() => setRightPanelClosed(false)}
                  ref={resizableRightPanelRef}
                  order={3}
                  id={'viewerLayoutResizableRightPanel'}
                >
                  <SidePanelWithServices
                    side="right"
                    isExpanded={!rightPanelClosedState}
                    servicesManager={servicesManager}
                    expandedWidth={rightPanelExpandedWidth}
                    collapsedWidth={panelGroupDefination.shared.collapsedWidth}
                    collapsedInsideBorderSize={
                      panelGroupDefination.shared.collapsedInsideBorderSize
                    }
                    collapsedOutsideBorderSize={
                      panelGroupDefination.shared.collapsedOutsideBorderSize
                    }
                    expandedInsideBorderSize={panelGroupDefination.shared.expandedInsideBorderSize}
                    onClose={onRightPanelClose}
                    onOpen={onRightPanelOpen}
                  />
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </React.Fragment>
      </div>
      <Onboarding />
      <InvestigationalUseDialog dialogConfiguration={appConfig?.investigationalUseDialog} />
    </div>
  );
}

ViewerLayout.propTypes = {
  // From extension module params
  extensionManager: PropTypes.shape({
    getModuleEntry: PropTypes.func.isRequired,
  }).isRequired,
  commandsManager: PropTypes.instanceOf(CommandsManager),
  servicesManager: PropTypes.object.isRequired,
  // From modes
  leftPanels: PropTypes.array,
  rightPanels: PropTypes.array,
  leftPanelClosed: PropTypes.bool.isRequired,
  rightPanelClosed: PropTypes.bool.isRequired,
  /** Responsible for rendering our grid of viewports; provided by consuming application */
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  viewports: PropTypes.array,
};

export default ViewerLayout;
