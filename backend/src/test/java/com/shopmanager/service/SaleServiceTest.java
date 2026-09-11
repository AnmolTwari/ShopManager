package com.shopmanager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.shopmanager.dto.common.PageResponse;
import com.shopmanager.dto.sale.SaleItemRequest;
import com.shopmanager.dto.sale.SaleRequest;
import com.shopmanager.dto.sale.SaleResponse;
import com.shopmanager.dto.sale.SaleSummaryResponse;
import com.shopmanager.entity.Category;
import com.shopmanager.entity.MovementType;
import com.shopmanager.entity.Product;
import com.shopmanager.entity.Sale;
import com.shopmanager.entity.SaleItem;
import com.shopmanager.entity.StockMovement;
import com.shopmanager.entity.Unit;
import com.shopmanager.entity.User;
import com.shopmanager.exception.InsufficientStockException;
import com.shopmanager.exception.ResourceNotFoundException;
import com.shopmanager.repository.ProductRepository;
import com.shopmanager.repository.SaleRepository;
import com.shopmanager.repository.StockMovementRepository;
import com.shopmanager.security.CurrentUserService;

@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private SaleService saleService;

    private User owner;
    private Product product;

    private SaleRequest saleRequest(BigDecimal quantity) {
        return new SaleRequest(List.of(new SaleItemRequest(1L, quantity)));
    }

    @BeforeEach
    void setUp() {
        owner = User.builder().username("owner").build();
        when(currentUserService.currentUser()).thenReturn(owner);
        Category category = new Category(owner, "Dairy");
        product = new Product(owner, "Milk", category, "Amul", "MILK-1", Unit.PIECE,
                new BigDecimal("20.00"), new BigDecimal("25.00"), null,
                new BigDecimal("10"), new BigDecimal("5"), true);
        ReflectionTestUtils.setField(product, "id", 1L);
    }

    @Test
    void createSaleComputesTotalReducesStockAndRecordsMovement() {
        when(productRepository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(inv -> inv.getArgument(0));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SaleResponse response = saleService.createSale(saleRequest(new BigDecimal("3")));

        assertThat(response.totalAmount()).isEqualByComparingTo("75.00");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().lineTotal()).isEqualByComparingTo("75.00");
        assertThat(product.getCurrentQuantity()).isEqualByComparingTo("7");
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        StockMovement movement = captor.getValue();
        assertThat(movement.getType()).isEqualTo(MovementType.SALE);
        assertThat(movement.getPreviousQuantity()).isEqualByComparingTo("10");
        assertThat(movement.getQuantityChanged()).isEqualByComparingTo("-3");
        assertThat(movement.getNewQuantity()).isEqualByComparingTo("7");
        verify(saleRepository).save(any(Sale.class));
    }

    @Test
    void createSaleThrowsWhenStockIsInsufficient() {
        when(productRepository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> saleService.createSale(saleRequest(new BigDecimal("15"))))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Milk");
        verify(saleRepository, never()).save(any(Sale.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void createSaleThrowsWhenProductMissing() {
        when(productRepository.findByIdAndOwner(99L, owner)).thenReturn(Optional.empty());
        SaleRequest request = new SaleRequest(List.of(new SaleItemRequest(99L, new BigDecimal("1"))));

        assertThatThrownBy(() -> saleService.createSale(request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createSaleChecksCumulativeStockAcrossDuplicateLines() {
        when(productRepository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(product));
        SaleRequest request = new SaleRequest(List.of(
                new SaleItemRequest(1L, new BigDecimal("4")),
                new SaleItemRequest(1L, new BigDecimal("7"))));

        assertThatThrownBy(() -> saleService.createSale(request))
                .isInstanceOf(InsufficientStockException.class);
    }

    @Test
    void createSaleMergesDuplicateLinesAndRecordsOneMovement() {
        when(productRepository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(inv -> inv.getArgument(0));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        SaleRequest request = new SaleRequest(List.of(
                new SaleItemRequest(1L, new BigDecimal("4")),
                new SaleItemRequest(1L, new BigDecimal("5"))));

        SaleResponse response = saleService.createSale(request);

        assertThat(response.items()).hasSize(2);
        assertThat(response.totalAmount()).isEqualByComparingTo("225.00");
        assertThat(product.getCurrentQuantity()).isEqualByComparingTo("1");
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantityChanged()).isEqualByComparingTo("-9");
        assertThat(captor.getValue().getNewQuantity()).isEqualByComparingTo("1");
    }

    @Test
    void getSaleReturnsExistingSale() {
        SaleItem item = new SaleItem(product, new BigDecimal("2"),
                new BigDecimal("25.00"), new BigDecimal("20.00"));
        Sale sale = new Sale(owner, List.of(item), new BigDecimal("50.00"));
        ReflectionTestUtils.setField(sale, "id", 3L);
        when(saleRepository.findByIdAndOwner(3L, owner)).thenReturn(Optional.of(sale));

        SaleResponse response = saleService.getSale(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.totalAmount()).isEqualByComparingTo("50.00");
        assertThat(response.items().getFirst().productName()).isEqualTo("Milk");
    }

    @Test
    void getSaleThrowsWhenMissing() {
        when(saleRepository.findByIdAndOwner(9L, owner)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> saleService.getSale(9L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listSalesReturnsSummaries() {
        SaleItem item = new SaleItem(product, new BigDecimal("1"),
                new BigDecimal("25.00"), new BigDecimal("20.00"));
        Sale sale = new Sale(owner, List.of(item), new BigDecimal("25.00"));
        ReflectionTestUtils.setField(sale, "id", 4L);
        Pageable pageable = PageRequest.of(0, 20);
        when(saleRepository.findByOwner(owner, pageable))
                .thenReturn(new PageImpl<>(List.of(sale), pageable, 1));

        PageResponse<SaleSummaryResponse> page = saleService.listSales(pageable);

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content().getFirst().id()).isEqualTo(4L);
        assertThat(page.content().getFirst().itemCount()).isEqualTo(1);
        assertThat(page.content().getFirst().totalAmount()).isEqualByComparingTo("25.00");
    }

    @Test
    void createSalePreservesMrpAndReturnsInResponse() {
        product.setMrp(new BigDecimal("30.00"));
        when(productRepository.findByIdAndOwner(1L, owner)).thenReturn(Optional.of(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(inv -> inv.getArgument(0));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SaleResponse response = saleService.createSale(saleRequest(new BigDecimal("2")));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().unitPrice()).isEqualByComparingTo("25.00");
        assertThat(response.items().getFirst().mrp()).isEqualByComparingTo("30.00");
        assertThat(response.totalAmount()).isEqualByComparingTo("50.00");
    }
}